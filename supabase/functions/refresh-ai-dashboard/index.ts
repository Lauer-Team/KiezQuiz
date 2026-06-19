import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const GITHUB_REPO = Deno.env.get("GITHUB_REPO") || "logic3/KiezQuiz";
const WORKFLOW_FILE = "dashboard-refresh.yml";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: cors,
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ ok: false, error: "login_required" }), {
      status: 401,
      headers: cors,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), {
      status: 500,
      headers: cors,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_city_wish_admin");
  if (adminError || !isAdmin) {
    return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
      status: 403,
      headers: cors,
    });
  }

  return new Response(
    JSON.stringify({
      ok: false,
      error: "maintenance",
      message: "Dashboard in Wartung — Neuberechnung pausiert bis VPS-Cockpit live ist.",
    }),
    { status: 503, headers: cors },
  );

  const githubPat = Deno.env.get("GITHUB_PAT")?.trim();
  if (!githubPat) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "github_pat_missing",
        message:
          "GITHUB_PAT fehlt in Supabase Edge Function Secrets. Siehe ops/ZUGAENGE.md.",
      }),
      { status: 503, headers: cors },
    );
  }

  const dispatchUrl =
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`;

  const ghRes = await fetch(dispatchUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubPat}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: "main" }),
  });

  if (!ghRes.ok) {
    const detail = await ghRes.text();
    console.error("GitHub workflow dispatch failed:", ghRes.status, detail);
    return new Response(
      JSON.stringify({ ok: false, error: "github_dispatch_failed", status: ghRes.status }),
      { status: 502, headers: cors },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      message: "Dashboard-Neuberechnung gestartet. Live in ca. 1–3 Minuten.",
    }),
    { status: 200, headers: cors },
  );
});
