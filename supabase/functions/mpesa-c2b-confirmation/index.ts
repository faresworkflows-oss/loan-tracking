// Supabase Edge Function: mpesa-c2b-confirmation
//
// PUBLIC endpoint — Safaricom posts here once a till payment has actually
// completed. Register this URL (after deploying) via the Daraja C2B
// registerurl call as your ConfirmationURL.
//
// Matching strategy: the payer's typed "account number" (BillRefNumber) is
// checked first against a loan reference (LN-XXXXXXXX), then against a
// registered borrower phone number. If neither resolves, the payment is
// stored as unmatched for manual reconciliation on the Payments page.

import { adminClient, applyPaymentToInstallment, findOpenInstallment, resolveLoanFromAccountNumber } from "../_shared/matching.ts";
import { sendAndLog } from "../_shared/sms.ts";
import { formatKES } from "../_shared/format.ts";

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const admin = adminClient();

    const amount = Number(body.TransAmount);
    const receipt = String(body.TransID ?? "");
    const phone = String(body.MSISDN ?? "");
    const accountNumberEntered = String(body.BillRefNumber ?? "");

    const loan = await resolveLoanFromAccountNumber(admin, accountNumberEntered || phone);

    if (!loan) {
      await admin.from("payments").insert({
        amount,
        channel: "c2b",
        mpesa_receipt_number: receipt,
        phone_number: phone,
        account_number_entered: accountNumberEntered,
        status: "unmatched",
        raw_callback: body,
      });
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const installment = await findOpenInstallment(admin, loan.id);
    if (!installment) {
      // Loan resolved but fully paid already — store unmatched for admin to review.
      await admin.from("payments").insert({
        loan_id: loan.id,
        borrower_id: loan.borrower_id,
        amount,
        channel: "c2b",
        mpesa_receipt_number: receipt,
        phone_number: phone,
        account_number_entered: accountNumberEntered,
        status: "unmatched",
        raw_callback: body,
      });
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: payment, error: insertError } = await admin
      .from("payments")
      .insert({
        loan_id: loan.id,
        borrower_id: loan.borrower_id,
        amount,
        channel: "c2b",
        mpesa_receipt_number: receipt,
        phone_number: phone,
        account_number_entered: accountNumberEntered,
        matched_installment_id: installment.id,
        status: "matched",
        raw_callback: body,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    const result = await applyPaymentToInstallment(admin, {
      loanId: loan.id,
      installmentId: installment.id,
      amount,
    });

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

    void payment; // referenced for clarity; nothing further to do with it here
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    // Still acknowledge — Safaricom will retry forever otherwise, and the
    // transaction has already happened on their side regardless.
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
