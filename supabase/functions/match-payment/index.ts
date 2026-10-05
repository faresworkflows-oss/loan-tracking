// Supabase Edge Function: match-payment
//
// Admin-triggered manual reconciliation for an unmatched payment (mainly
// C2B till payments that couldn't be auto-matched). Applies the payment to
// the chosen installment, updates the loan balance, and sends the
// payment-received SMS — all server-side, atomically from the client's
// point of view.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { applyPaymentToInstallment, adminClient } from "../_shared/matching.ts";
import { sendAndLog } from "../_shared/sms.ts";
import { formatKES } from "../_shared/format.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(JSON.stringify({ error: "Only admins can match payments" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { paymentId, borrowerId, loanId, installmentId } = await req.json();
    if (!paymentId || !borrowerId || !loanId || !installmentId) {
      return new Response(JSON.stringify({ error: "paymentId, borrowerId, loanId, installmentId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("amount")
      .eq("id", paymentId)
      .single();
    if (paymentError) throw paymentError;

    const result = await applyPaymentToInstallment(admin, {
      loanId,
      installmentId,
      amount: Number(payment.amount),
    });

    const { error: updatePaymentError } = await admin
      .from("payments")
      .update({ borrower_id: borrowerId, loan_id: loanId, matched_installment_id: installmentId, status: "matched" })
      .eq("id", paymentId);
    if (updatePaymentError) throw updatePaymentError;

    await sendAndLog({
      supabaseUrl,
      serviceRoleKey,
      borrowerId: result.borrowerId,
      phone: result.borrowerPhone,
      type: "payment_received",
      message: `Payment of ${formatKES(Number(payment.amount))} received for ${result.loanRef}, installment ${result.installmentNumber}. New balance: ${formatKES(result.newOutstandingBalance)}.`,
    });

    return new Response(JSON.stringify({ ok: true, newOutstandingBalance: result.newOutstandingBalance }), {
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
