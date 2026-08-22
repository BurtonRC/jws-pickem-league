import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = [
  "https://jwnflpickem.com",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";

  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin)
      ? origin
      : "https://jwnflpickem.com",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function getBearerToken(req: Request) {
  const header = req.headers.get("Authorization") ?? "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

function parsePositiveInt(value: unknown) {
  const n = Number(value);

  return Number.isInteger(n) && n > 0
    ? n
    : null;
}

async function githubRequest(
  token: string,
  path: string,
  init: RequestInit = {},
) {
  const response = await fetch(
    `https://api.github.com${path}`,
    {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "JW-NFL-Pickem-Admin",
        ...(init.headers ?? {}),
      },
    },
  );

  const text = await response.text();

  let body: any = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  return { response, body };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  const json = (
    body: unknown,
    status = 200,
  ) =>
    new Response(
      JSON.stringify(body),
      {
        status,
        headers: corsHeaders,
      },
    );

  // ---------------------------------------------------------
  // CORS PREFLIGHT
  // ---------------------------------------------------------

  if (req.method === "OPTIONS") {
    return new Response(
      "ok",
      {
        headers: corsHeaders,
      },
    );
  }

  // ---------------------------------------------------------
  // METHOD CHECK
  // ---------------------------------------------------------

  if (req.method !== "POST") {
    return json(
      {
        success: false,
        error: "POST required.",
      },
      405,
    );
  }

  // ---------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------

  const token = getBearerToken(req);

  if (!token) {
    return json(
      {
        success: false,
        error: "Authentication required.",
      },
      401,
    );
  }

  // ---------------------------------------------------------
  // SUPABASE CONFIG
  // ---------------------------------------------------------

  const supabaseUrl =
    Deno.env.get("SUPABASE_URL");

  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    console.error(
      "Missing Supabase function configuration.",
    );

    return json(
      {
        success: false,
        error: "Server configuration error.",
      },
      500,
    );
  }

  // User-scoped client.
  // The request JWT is used for authentication
  // and the is_app_admin() RPC.
  //
  // No service-role key is exposed to the browser.

  const supabase = createClient(
    supabaseUrl,
    anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );

  // ---------------------------------------------------------
  // VERIFY USER
  // ---------------------------------------------------------

  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    return json(
      {
        success: false,
        error: "Invalid authentication.",
      },
      401,
    );
  }

  // ---------------------------------------------------------
  // VERIFY ADMIN
  // ---------------------------------------------------------

  const {
    data: isAdmin,
    error: adminError,
  } =
    await supabase.rpc("is_app_admin");

  if (adminError) {
    console.error(
      "Admin check failed:",
      adminError,
    );

    return json(
      {
        success: false,
        error:
          "Unable to verify admin access.",
      },
      500,
    );
  }

  if (!isAdmin) {
    return json(
      {
        success: false,
        error: "Admin access required.",
      },
      403,
    );
  }

  // ---------------------------------------------------------
  // REQUEST BODY
  // ---------------------------------------------------------

  let body: any;

  try {
    body = await req.json();
  } catch {
    return json(
      {
        success: false,
        error: "Invalid JSON body.",
      },
      400,
    );
  }

  const action = body?.action ?? "start";

  // ---------------------------------------------------------
  // GITHUB CONFIG
  // ---------------------------------------------------------

  const owner =
    Deno.env.get("GITHUB_OWNER");

  const repo =
    Deno.env.get("GITHUB_REPO");

  const workflow =
    Deno.env.get("GITHUB_WORKFLOW") ??
    "process-week.yml";

  const ref =
    Deno.env.get("GITHUB_REF") ??
    "main";

  const githubToken =
    Deno.env.get("GITHUB_TOKEN");

  const allowedSeason =
    parsePositiveInt(
      Deno.env.get(
        "PROCESS_RESULTS_SEASON",
      ) ?? "2026",
    );

  if (
    !owner ||
    !repo ||
    !githubToken ||
    !allowedSeason
  ) {
    console.error(
      "Missing GitHub function configuration.",
    );

    return json(
      {
        success: false,
        error: "Server configuration error.",
      },
      500,
    );
  }

  // ---------------------------------------------------------
  // START PROCESSING
  // ---------------------------------------------------------

  if (action === "start") {
    const season =
      parsePositiveInt(body?.season);

    const week =
      parsePositiveInt(body?.week);

    if (!season || !week) {
      return json(
        {
          success: false,
          error:
            "Season and week are required integers.",
        },
        400,
      );
    }

    if (season !== allowedSeason) {
      return json(
        {
          success: false,
          error:
            `The Admin Results processor is restricted to season ${allowedSeason}.`,
        },
        400,
      );
    }

    if (week < 1 || week > 18) {
      return json(
        {
          success: false,
          error:
            "Week must be between 1 and 18.",
        },
        400,
      );
    }

    const dispatch =
      await githubRequest(
        githubToken,
        `/repos/${encodeURIComponent(
          owner,
        )}/${encodeURIComponent(
          repo,
        )}/actions/workflows/${encodeURIComponent(
          workflow,
        )}/dispatches`,
        {
          method: "POST",
          body: JSON.stringify({
            ref,
            inputs: {
              season: String(season),
              week: String(week),
            },
          }),
          headers: {
            "Content-Type":
              "application/json",
          },
        },
      );

    if (!dispatch.response.ok) {
      console.error(
        "GitHub workflow dispatch failed:",
        dispatch.response.status,
      );

      return json(
        {
          success: false,
          error:
            dispatch.body?.message ??
            "GitHub workflow dispatch failed.",
        },
        502,
      );
    }

    const runId =
      dispatch.body?.workflow_run_id ??
      null;

    const runUrl =
      dispatch.body?.html_url ??
      null;

    return json({
      success: true,
      action: "started",
      season,
      week,
      run_id: runId,
      run_url: runUrl,
      status: "queued",
    });
  }

  // ---------------------------------------------------------
  // CHECK STATUS
  // ---------------------------------------------------------

  if (action === "status") {
    const runId =
      parsePositiveInt(body?.run_id);

    if (!runId) {
      return json(
        {
          success: false,
          error:
            "A valid run_id is required.",
        },
        400,
      );
    }

    const run =
      await githubRequest(
        githubToken,
        `/repos/${encodeURIComponent(
          owner,
        )}/${encodeURIComponent(
          repo,
        )}/actions/runs/${runId}`,
      );

    if (!run.response.ok) {
      console.error(
        "GitHub workflow status failed:",
        run.response.status,
      );

      return json(
        {
          success: false,
          error:
            run.body?.message ??
            "Unable to retrieve workflow status.",
        },
        502,
      );
    }

    return json({
      success: true,
      action: "status",
      run_id: run.body.id,
      run_url: run.body.html_url,
      status: run.body.status,
      conclusion: run.body.conclusion,
      created_at: run.body.created_at,
      started_at: run.body.run_started_at,
      updated_at: run.body.updated_at,
    });
  }

  // ---------------------------------------------------------
  // UNKNOWN ACTION
  // ---------------------------------------------------------

  return json(
    {
      success: false,
      error:
        "Unsupported action. Use 'start' or 'status'.",
    },
    400,
  );
});