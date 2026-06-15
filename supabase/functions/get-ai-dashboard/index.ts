import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "X-Dashboard-Updated",
};

const BUCKET = "ops-dashboard";
const OBJECT = "dashboard.html";

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
  const { data: file, error: downloadError } = await serviceClient.storage
    .from(BUCKET)
    .download(OBJECT);

  if (downloadError || !file) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "dashboard_missing",
        message: "Dashboard noch nicht hochgeladen. GitHub Action oder upload_ai_dashboard.py ausführen.",
      }),
      {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  let updatedAt = new Date().toISOString();
  const { data: listing } = await serviceClient.storage.from(BUCKET).list("", {
    search: OBJECT,
    limit: 1,
  });
  if (listing?.[0]?.updated_at) {
    updatedAt = listing[0].updated_at;
  }

  const html = await file.text();
  return new Response(html, {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Dashboard-Updated": updatedAt,
    },
  });
});
