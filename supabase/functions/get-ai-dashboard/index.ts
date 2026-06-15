import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Expose-Headers": "X-Dashboard-Updated, X-Dashboard-Format",
};

const BUCKET = "ops-dashboard";
const OBJECT_JSON = "dashboard-data.json";
const OBJECT_HTML = "dashboard.html";

async function requireAdmin(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false as const, status: 401, error: "login_required" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false as const, status: 500, error: "server_misconfigured" };
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: isAdmin, error } = await userClient.rpc("is_city_wish_admin");
  if (error || !isAdmin) {
    return { ok: false as const, status: 403, error: "forbidden" };
  }

  return { ok: true as const };
}

function wantsHtml(req: Request): boolean {
  const url = new URL(req.url);
  if (url.searchParams.get("format") === "html") return true;
  const accept = req.headers.get("Accept") ?? "";
  return accept.includes("text/html") && !accept.includes("application/json");
}

async function getUpdatedAt(
  serviceClient: ReturnType<typeof createClient>,
  objectName: string,
): Promise<string> {
  const { data: listing } = await serviceClient.storage.from(BUCKET).list("", {
    search: objectName,
    limit: 1,
  });
  if (listing?.[0]?.updated_at) {
    return listing[0].updated_at;
  }
  return new Date().toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const gate = await requireAdmin(req.headers.get("Authorization"));
  if (!gate.ok) {
    return new Response(JSON.stringify({ ok: false, error: gate.error }), {
      status: gate.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const legacyHtml = wantsHtml(req);
  const objectName = legacyHtml ? OBJECT_HTML : OBJECT_JSON;

  const { data: file, error: downloadError } = await serviceClient.storage
    .from(BUCKET)
    .download(objectName);

  if (downloadError || !file) {
    if (!legacyHtml) {
      const { data: htmlFallback } = await serviceClient.storage
        .from(BUCKET)
        .download(OBJECT_HTML);
      if (htmlFallback) {
        const updatedAt = await getUpdatedAt(serviceClient, OBJECT_HTML);
        const html = await htmlFallback.text();
        return new Response(html, {
          status: 200,
          headers: {
            ...cors,
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Dashboard-Updated": updatedAt,
            "X-Dashboard-Format": "html-legacy-fallback",
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: "dashboard_missing",
        message:
          "Dashboard noch nicht hochgeladen. GitHub Action oder upload_ai_dashboard.py ausführen.",
      }),
      {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  const updatedAt = await getUpdatedAt(serviceClient, objectName);

  if (legacyHtml) {
    const html = await file.text();
    return new Response(html, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Dashboard-Updated": updatedAt,
        "X-Dashboard-Format": "html",
      },
    });
  }

  const text = await file.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "invalid_json", message: "dashboard-data.json ungültig" }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify({ ok: true, data: payload }), {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Dashboard-Updated": updatedAt,
      "X-Dashboard-Format": "json",
    },
  });
});
