// Supabase Edge Function: mpesa-stk-callback
//
// PUBLIC endpoint — Safaricom posts the result of an STK push here. No
// user auth (Safaricom can't supply a Supabase JWT), so this must stay
// narrowly scoped to only ever touch the payment row matching the
// CheckoutRequestID it's given.
//
// Set this function's full URL as MPESA_CALLBACK_URL (a secret on
// mpesa-stk-push) once deployed, and register it in your Daraja app.

import { adminClient, applyPaymentToInstallment } from "../_shared/matching.ts";
import { sendAndLog } from "../_shared/sms.ts";
import { formatKES } from "../_shared/format.ts";

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const callback = body?.Body?.stkCallback;
    if (!callback) {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Ignored: no stkCallback" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();
    const checkoutRequestId = callback.CheckoutRequestID;

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("*")
      .eq("checkout_request_id", checkoutRequestId)
      .maybeSingle();

    if (paymentError || !payment) {
      // Nothing we recognize — acknowledge so Safaricom stops retrying, but do nothing.
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    await admin.from("payments").update({ raw_callback: body }).eq("id", payment.id);

    if (callback.ResultCode !== 0) {
      // User cancelled or it failed/timed out — leave unmatched, no SMS.
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const items: { Name: string; Value: unknown }[] = callback.CallbackMetadata?.Item ?? [];
    const get = (name: string) => items.find((i) => i.Name === name)?.Value;
    const amount = Number(get("Amount") ?? payment.amount);
    const receipt = String(get("MpesaReceiptNumber") ?? "");
    const phone = String(get("PhoneNumber") ?? payment.phone_number ?? "");

    if (!payment.loan_id || !payment.matched_installment_id) {
      // Shouldn't happen (stk-push always sets these), but guard anyway.
      await admin
        .from("payments")
        .update({ mpesa_receipt_number: receipt, amount, phone_number: phone })
        .eq("id", payment.id);
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await applyPaymentToInstallment(admin, {
      loanId: payment.loan_id,
      installmentId: payment.matched_installment_id,
      amount,
    });

    await admin
      .from("payments")
      .update({
        mpesa_receipt_number: receipt,
        amount,
        phone_number: phone,
        status: "matched",
      })
      .eq("id", payment.id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    await sendAndLog({
      supabaseUrl,
      serviceRoleKey,
      borrowerId: result.borrowerId,
      phone: result.borrowerPhone,
      type: "payment_received",
      message: `Payment of ${formatKES(amount)} received for ${result.loanRef}, installment ${result.installmentNumber}. New balance: ${formatKES(result.newOutstandingBalance)}.`,
    });

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Always acknowledge 200 to Safaricom even on our own errors, or it will
    // retry the same callback repeatedly.
    console.error(err);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
