// Shared payment-application logic used by match-payment, the STK
// callback, and the C2B confirmation functions, so the balance math only
// lives in one place.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export function loanRef(loanId: string) {
  return `LN-${loanId.slice(0, 8).toUpperCase()}`;
}

export interface ApplyResult {
  newOutstandingBalance: number;
  installmentNumber: number;
  borrowerId: string;
  borrowerPhone: string;
  loanRef: string;
}

/**
 * Applies a payment amount to a specific installment: bumps amount_paid,
 * flips status to "paid" if it's now fully covered, and recomputes the
 * loan's outstanding_balance from the full schedule.
 */
export async function applyPaymentToInstallment(
  admin: SupabaseClient,
  params: { loanId: string; installmentId: string; amount: number },
): Promise<ApplyResult> {
  const { data: installment, error: instError } = await admin
    .from("repayment_schedule")
    .select("*")
    .eq("id", params.installmentId)
    .single();
  if (instError) throw instError;

  const newAmountPaid = Number(installment.amount_paid) + params.amount;
  const newStatus = newAmountPaid >= Number(installment.amount_due) ? "paid" : installment.status;

  const { error: updateInstError } = await admin
    .from("repayment_schedule")
    .update({ amount_paid: newAmountPaid, status: newStatus })
    .eq("id", params.installmentId);
  if (updateInstError) throw updateInstError;

  const { data: scheduleRows, error: scheduleError } = await admin
    .from("repayment_schedule")
    .select("amount_due, amount_paid")
    .eq("loan_id", params.loanId);
  if (scheduleError) throw scheduleError;

  const outstanding = scheduleRows.reduce(
    (sum: number, r: { amount_due: number; amount_paid: number }) =>
      sum + (Number(r.amount_due) - Number(r.amount_paid)),
    0,
  );

  const { data: loan, error: loanError } = await admin
    .from("loans")
    .update({ outstanding_balance: outstanding, status: outstanding <= 0 ? "completed" : "active" })
    .eq("id", params.loanId)
    .select("id, borrower_id")
    .single();
  if (loanError) throw loanError;

  const { data: borrower, error: borrowerError } = await admin
    .from("borrowers")
    .select("phone")
    .eq("id", loan.borrower_id)
    .single();
  if (borrowerError) throw borrowerError;

  return {
    newOutstandingBalance: outstanding,
    installmentNumber: installment.installment_no,
    borrowerId: loan.borrower_id,
    borrowerPhone: borrower.phone,
    loanRef: loanRef(params.loanId),
  };
}

/**
 * Finds the earliest open (not fully paid) installment for a loan, used
 * when a payment arrives without a pre-specified installment (C2B).
 */
export async function findOpenInstallment(admin: SupabaseClient, loanId: string) {
  const { data, error } = await admin
    .from("repayment_schedule")
    .select("*")
    .eq("loan_id", loanId)
    .order("installment_no", { ascending: true });
  if (error) throw error;
  return (data ?? []).find((i: { amount_paid: number; amount_due: number }) => Number(i.amount_paid) < Number(i.amount_due));
}

/**
 * Resolves a loan from whatever the payer typed as their till "account
 * number" — either the loan's display reference (LN-XXXXXXXX) or their
 * registered phone number. Returns null if nothing matches.
 */
export async function resolveLoanFromAccountNumber(admin: SupabaseClient, raw: string | undefined) {
  if (!raw) return null;
  const cleaned = raw.trim().toUpperCase();

  if (cleaned.startsWith("LN-")) {
    const prefix = cleaned.slice(3).toLowerCase();
    const { data: loans } = await admin.from("loans").select("id, borrower_id, status").eq("status", "active");
    const match = (loans ?? []).find((l: { id: string }) => l.id.startsWith(prefix));
    if (match) return match;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 9) {
    const { data: borrower } = await admin
      .from("borrowers")
      .select("id")
      .ilike("phone", `%${digits.slice(-9)}`)
      .maybeSingle();
    if (borrower) {
      const { data: loan } = await admin
        .from("loans")
        .select("id, borrower_id, status")
        .eq("borrower_id", borrower.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (loan) return loan;
    }
  }

  return null;
}

export function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}
