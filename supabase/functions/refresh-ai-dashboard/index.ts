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

const AGENT_ROUTINES: Record<string, string> = {
  "CEO-Kalle": "deadlines",
  "CMO-Marie": "seo-daily",
  "CFO-Fiona": "finance",
  "COO-Oskar": "uptime",
  "CSO-Stella": "security",
  "CXO-Xenia": "support",
  "CTO-Theo": "dashboard",
  "CLO-Lena": "dashboard",
};

async function requireAdmin(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false as const, status: 401, error: "login_required" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false as const, status: 500, error: "server_misconfigured" };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: isAdmin, error } = await supabase.rpc("is_city_wish_admin");
  if (error || !isAdmin) {
    return { ok: false as const, status: 403, error: "forbidden" };
  }

  return { ok: true as const };
}

async function triggerN8nRefresh(routine: string, agentId: string | null) {
  const webhook = Deno.env.get("N8N_KQ_OPS_REFRESH_WEBHOOK")?.trim();
  if (!webhook) return null;

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ routine, agentId, source: "admin-dashboard" }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`n8n_webhook_failed:${res.status}:${detail.slice(0, 200)}`);
  }

  return await res.json().catch(() => ({ ok: true }));
}

async function triggerGithubRefresh(routine: string, agentId: string | null) {
  const githubPat = Deno.env.get("GITHUB_PAT")?.trim();
  if (!githubPat) {
    return {
      ok: false,
      error: "github_pat_missing",
      message:
        "GITHUB_PAT fehlt in Supabase Edge Function Secrets. Siehe ops/ZUGAENGE.md.",
    };
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
    body: JSON.stringify({
      ref: "main",
      inputs: {
        routine: routine || "dashboard",
        agent_id: agentId || "",
      },
    }),
  });

  if (!ghRes.ok) {
    const detail = await ghRes.text();
    console.error("GitHub workflow dispatch failed:", ghRes.status, detail);
    return { ok: false, error: "github_dispatch_failed", status: ghRes.status };
  }

  return {
    ok: true,
    message: "Neuberechnung gestartet — in ca. 1–3 Minuten neu laden.",
    via: "github",
  };
}

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

  const gate = await requireAdmin(req.headers.get("Authorization"));
  if (!gate.ok) {
    return new Response(JSON.stringify({ ok: false, error: gate.error }), {
      status: gate.status,
      headers: cors,
    });
  }

  let agentId: string | null = null;
  try {
    const body = await req.json();
    agentId = typeof body?.agentId === "string" ? body.agentId : null;
  } catch {
    agentId = null;
  }

  const routine = (agentId && AGENT_ROUTINES[agentId]) || "dashboard";

  try {
    const n8nResult = await triggerN8nRefresh(routine, agentId);
    if (n8nResult) {
      return new Response(
        JSON.stringify({
          ok: true,
          message: "Routine auf dem VPS gestartet — in ca. 1–2 Minuten neu laden.",
          routine,
          agentId,
          via: "n8n",
        }),
        { status: 200, headers: cors },
      );
    }
  } catch (err) {
    console.error("n8n refresh failed:", err);
  }

  const ghResult = await triggerGithubRefresh(routine, agentId);
  const status = ghResult.ok ? 200 : ghResult.error === "github_pat_missing" ? 503 : 502;

  return new Response(JSON.stringify(ghResult), { status, headers: cors });
});
