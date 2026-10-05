// Supabase Edge Function: create-borrower
//
// Creates a borrower record AND a matching Supabase Auth account in one
// step, using the service-role key (server-side only — never exposed to
// the browser). Called from the admin dashboard via
// supabase.functions.invoke("create-borrower", { body: {...} }).
//
// Deploy with:  supabase functions deploy create-borrower
// Requires these secrets to be set in the Supabase project (Settings ->
// Edge Functions -> Secrets), NOT in your .env / frontend:
//   SUPABASE_URL              (auto-provided by the platform)
//   SUPABASE_SERVICE_ROLE_KEY (auto-provided by the platform)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { sendAndLog } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomPassword(length = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client scoped to the calling user's JWT, used only to verify they're an admin.
    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();

    if (!caller) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: adminRow } = await admin
      .from("admins")
      .select("id")
      .eq("id", caller.id)
      .maybeSingle();

    if (!adminRow) {
      return new Response(JSON.stringify({ error: "Only admins can create borrowers" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { full_name, phone, email, national_id } = await req.json();

    if (!full_name || !phone || !email) {
      return new Response(
        JSON.stringify({ error: "full_name, phone and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tempPassword = randomPassword();

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (authError || !authUser.user) {
      return new Response(JSON.stringify({ error: authError?.message ?? "Could not create auth user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: borrower, error: borrowerError } = await admin
      .from("borrowers")
      .insert({
        full_name,
        phone,
        email,
        national_id: national_id || null,
        auth_user_id: authUser.user.id,
      })
      .select()
      .single();

    if (borrowerError) {
      // Roll back the auth user so we don't leave an orphaned account.
      await admin.auth.admin.deleteUser(authUser.user.id);
      return new Response(JSON.stringify({ error: borrowerError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sendAndLog({
      supabaseUrl,
      serviceRoleKey,
      borrowerId: borrower.id,
      phone,
      type: "account_created",
      message: `Welcome to Mutiso's Lending. Log in at your portal with email ${email} and temporary password ${tempPassword}. Please change it after logging in.`,
    });

    return new Response(JSON.stringify({ borrower, temp_password: tempPassword }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
