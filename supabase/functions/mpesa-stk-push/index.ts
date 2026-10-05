// Supabase Edge Function: mpesa-stk-push
//
// Admin-triggered: initiates an M-Pesa STK Push to a borrower's phone for
// a specific installment, and records a pending `payments` row so the
// callback (mpesa-stk-callback) can find it by CheckoutRequestID.
//
// Requires these secrets (Settings -> Edge Functions -> Secrets):
//   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET  (from your Daraja app)
//   MPESA_SHORTCODE                             e.g. "174379" for sandbox
//   MPESA_PASSKEY                               Daraja sandbox/production passkey
//   MPESA_ENV                                   "sandbox" | "production"
//   MPESA_CALLBACK_URL                           full URL of the deployed
//                                                mpesa-stk-callback function

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { adminClient } from "../_shared/matching.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function baseUrl() {
  return Deno.env.get("MPESA_ENV") === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

async function getAccessToken() {
  const key = Deno.env.get("MPESA_CONSUMER_KEY")!;
  const secret = Deno.env.get("MPESA_CONSUMER_SECRET")!;
  const creds = btoa(`${key}:${secret}`);
  const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${creds}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errorMessage ?? "Could not get Daraja access token");
  return json.access_token as string;
}

function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

    const admin = adminClient();
    const { data: adminRow } = await admin.from("admins").select("id").eq("id", caller.id).maybeSingle();
    if (!adminRow) {
      return new Response(JSON.stringify({ error: "Only admins can request STK pushes" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { loanId, installmentId, phone, amount } = await req.json();
    if (!loanId || !installmentId || !phone || !amount) {
      return new Response(
        JSON.stringify({ error: "loanId, installmentId, phone, amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: loan, error: loanError } = await admin
      .from("loans")
      .select("id, borrower_id")
      .eq("id", loanId)
      .single();
    if (loanError) throw loanError;

    const shortcode = Deno.env.get("MPESA_SHORTCODE")!;
    const passkey = Deno.env.get("MPESA_PASSKEY")!;
    const ts = timestamp();
    const password = btoa(`${shortcode}${passkey}${ts}`);
    const accessToken = await getAccessToken();

    // Daraja expects 2547XXXXXXXX, no leading +
    const normalizedPhone = phone.replace(/^\+/, "").replace(/^0/, "254");

    const stkRes = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(Number(amount)),
        PartyA: normalizedPhone,
        PartyB: shortcode,
        PhoneNumber: normalizedPhone,
        CallBackURL: Deno.env.get("MPESA_CALLBACK_URL"),
        AccountReference: `LN-${loanId.slice(0, 8).toUpperCase()}`,
        TransactionDesc: "Loan repayment",
      }),
    });
    const stkJson = await stkRes.json();

    if (!stkRes.ok || stkJson.ResponseCode !== "0") {
      return new Response(
        JSON.stringify({ error: stkJson.errorMessage ?? stkJson.ResponseDescription ?? "STK push failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: insertError } = await admin.from("payments").insert({
      loan_id: loanId,
      borrower_id: loan.borrower_id,
      amount: Number(amount),
      channel: "stk_push",
      phone_number: normalizedPhone,
      checkout_request_id: stkJson.CheckoutRequestID,
      matched_installment_id: installmentId,
      status: "unmatched", // flips to matched once the callback confirms
    });
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ ok: true, checkoutRequestId: stkJson.CheckoutRequestID }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
