// Creates an HR, Employee, or Intern account on behalf of a signed-in
// Admin or HR user.
//
// Creating Auth users needs the service role key, so it has to happen here
// rather than in the browser. The function verifies the caller, generates a
// company ID, creates the Auth user, then inserts the matching profile,
// rolling the Auth user back if the profile insert fails.
//
// Deployed with verify_jwt = false because it validates the caller's token
// itself (see callerClient below).
//
// Environment variables:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   provided by Supabase
//   PROJECT_ANON_KEY                          anon key, set as a secret
//   ALLOWED_ORIGINS                           optional, comma-separated list
//                                             of frontend origins

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
  const anonKey = Deno.env.get("PROJECT_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond(req, 500, { error: "Server configuration is incomplete." });
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return respond(req, 401, { error: "Authentication required." });
  }

  // Use the caller's token to verify their identity.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser();

  if (callerError || !caller) {
    return respond(req, 401, { error: "Invalid or expired session." });
  }

  // Privileged client stays inside this server-side function.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role, is_active")
    .eq("id", caller.id)
    .maybeSingle();

  if (
    profileError ||
    !callerProfile ||
    callerProfile.is_active !== true
  ) {
    return respond(req, 403, { error: "Active account required." });
  }

  if (!["Admin", "HR"].includes(callerProfile.role)) {
    return respond(req, 403, { error: "You are not allowed to create accounts." });
  }

  let body: {
    name?: string;
    email?: string;
    role?: string;
    department?: string | null;
    password?: string;
  };

  try {
    body = await req.json();
  } catch {
    return respond(req, 400, { error: "Invalid JSON request body." });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const role = body.role;
  const department = body.department?.trim() || null;
  const password = body.password;

  if (!name || !email || !role || !password) {
    return respond(req, 400, {
      error: "Name, email, role, and initial password are required.",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond(req, 400, { error: "Enter a valid email address." });
  }

  if (password.length < 12) {
    return respond(req, 400, {
      error: "The initial password must be at least 12 characters.",
    });
  }

  if (!["HR", "Employee", "Intern"].includes(role)) {
    return respond(req, 400, {
      error: "Only HR, Employee, and Intern accounts can be created here.",
    });
  }

  // HR may create employees and interns, but only Admin may create HR.
  if (callerProfile.role === "HR" && role !== "Employee" && role !== "Intern") {
    return respond(req, 403, {
      error: "HR can create Employee and Intern accounts only.",
    });
  }

  const { data: companyId, error: codeError } = await adminClient.rpc(
    "generate_user_code",
    { role_name: role },
  );

  if (codeError || typeof companyId !== "string") {
    console.error("Company ID generation failed:", codeError);
    return respond(req, 500, { error: "Unable to generate a company ID." });
  }

  // Create the Auth user. The password is handled by Supabase Auth.
  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

  if (createError || !created.user) {
    console.error("Auth user creation failed:", createError);

    // The counter has already advanced, leaving a harmless gap in the IDs.
    return respond(req, 400, {
      error: "Unable to create the Auth account. Check whether the email is already registered.",
    });
  }

  // Link the profile to the Auth UUID.
  const { error: insertError } = await adminClient.from("profiles").insert({
    id: created.user.id,
    user_id: companyId,
    name,
    email,
    role,
    department,
    is_active: true,
  });

  if (insertError) {
    console.error("Profile creation failed:", insertError);

    // Roll back the Auth account if its profile could not be created.
    const { error: rollbackError } =
      await adminClient.auth.admin.deleteUser(created.user.id);

    if (rollbackError) {
      console.error("Auth rollback failed:", rollbackError);
    }

    return respond(req, 500, {
      error: "The profile could not be created. Please retry or contact support.",
    });
  }

  return respond(req, 201, {
    message: "User created successfully.",
    user: {
      id: created.user.id,
      userId: companyId,
      name,
      email,
      role,
      department,
      isActive: true,
    },
  });
});
