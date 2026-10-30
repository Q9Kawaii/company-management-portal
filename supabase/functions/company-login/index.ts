// Signs a user in with their company ID (e.g. EMP0003) or email address.
//
// The browser can't look up the email for a company ID itself, because
// profiles are protected by RLS before sign-in. This function resolves the
// ID with the secret key, then verifies the password through Supabase Auth
// and returns the resulting session.
//
// Environment variables:
//   SUPABASE_URL, SUPABASE_ANON_KEY   provided by Supabase
//   PORTAL_SUPABASE_SECRET_KEY        secret (service) key, set as a secret
//   ALLOWED_ORIGINS                   optional, comma-separated list of
//                                     frontend origins (default: Vite dev URL)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = (
  Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";

  return {
    // Echo the caller's origin only when it is on the allow list.
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function respond(
  req: Request,
  status: number,
  body: Record<string, unknown>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return respond(req, 405, { error: "Method not allowed." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey = Deno.env.get("PORTAL_SUPABASE_SECRET_KEY");

  if (!supabaseUrl || !anonKey || !secretKey) {
    return respond(req, 500, { error: "Server configuration is incomplete." });
  }

  let body: { userId?: string; password?: string };

  try {
    body = await req.json();
  } catch {
    return respond(req, 400, { error: "Invalid request." });
  }

  const identifier = body.userId?.trim();
  const password = body.password;

  if (!identifier || !password) {
    return respond(req, 400, {
      error: "Enter your company ID or email and password.",
    });
  }

  const isEmail = identifier.includes("@");

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const profileQuery = adminClient
    .from("profiles")
    .select("id, user_id, email, is_active");

  const { data: profile, error: profileError } = isEmail
    ? await profileQuery.ilike("email", identifier).maybeSingle()
    : await profileQuery.eq("user_id", identifier.toUpperCase()).maybeSingle();

  // Every failure returns the same message so the response doesn't reveal
  // which company IDs exist or which accounts are deactivated.
  if (
    profileError ||
    !profile ||
    profile.is_active !== true ||
    !profile.email
  ) {
    return respond(req, 401, { error: "Invalid company ID or password." });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } =
    await authClient.auth.signInWithPassword({
      email: profile.email,
      password,
    });

  if (
    authError ||
    !authData.session ||
    authData.user.id !== profile.id
  ) {
    return respond(req, 401, { error: "Invalid company ID or password." });
  }

  return respond(req, 200, {
    session: authData.session,
    user: {
      id: profile.id,
      userId: profile.user_id,
      isActive: true,
    },
  });
});
