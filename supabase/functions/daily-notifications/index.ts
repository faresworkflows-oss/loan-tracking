// Supabase Edge Function: daily-notifications
//
// Call this once a day from n8n (or Supabase's own pg_cron via
// `net.http_post`, if you'd rather not run it through n8n). It:
//   1. Sends a due-date reminder for every installment due today.
//   2. Applies a flat penalty + sends an overdue notice for every
//      installment that was due exactly 3 days ago and is still unpaid
//      (i.e. the grace period just lapsed).
//
// PUBLIC endpoint, protected by a shared secret since it's triggered by an
// external scheduler, not a logged-in user. Set:
//   CRON_SECRET          — any random string you choose
//   PENALTY_FLAT_AMOUNT  — the flat penalty fee in KES, e.g. "500"
// and call this with header:  x-cron-secret: <CRON_SECRET>

import { adminClient, loanRef } from "../_shared/matching.ts";
import { sendAndLog } from "../_shared/sms.ts";
import { formatKES } from "../_shared/format.ts";

function isoDateDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function isoDateToday() {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  const expected = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = adminClient();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const penaltyAmount = Number(Deno.env.get("PENALTY_FLAT_AMOUNT") ?? "500");

  let reminders = 0;
  let overdue = 0;
  const errors: string[] = [];

  // ── Due-date reminders ──────────────────────────────────────────────
  const { data: dueToday, error: dueTodayError } = await admin
    .from("repayment_schedule")
    .select("*, loans(id, borrower_id, borrowers(phone))")
    .eq("due_date", isoDateToday())
    .eq("status", "pending");
  if (dueTodayError) errors.push(dueTodayError.message);

  for (const row of dueToday ?? []) {
    const loan = row.loans as { id: string; borrower_id: string; borrowers: { phone: string } } | null;
    if (!loan?.borrowers?.phone) continue;
    try {
      await sendAndLog({
        supabaseUrl,
        serviceRoleKey,
        borrowerId: loan.borrower_id,
        phone: loan.borrowers.phone,
        type: "reminder",
        message: `Reminder: your installment of ${formatKES(Number(row.amount_due))} for ${loanRef(loan.id)} is due today.`,
      });
      reminders++;
    } catch (err) {
      errors.push((err as Error).message);
    }
  }

  // ── Overdue + penalty (grace period = 3 days) ───────────────────────
  const { data: pastDue, error: pastDueError } = await admin
    .from("repayment_schedule")
    .select("*, loans(id, borrower_id, borrowers(phone))")
    .eq("due_date", isoDateDaysAgo(3))
    .eq("status", "pending");
  if (pastDueError) errors.push(pastDueError.message);

  for (const row of pastDue ?? []) {
    const loan = row.loans as { id: string; borrower_id: string; borrowers: { phone: string } } | null;
    if (!loan?.borrowers?.phone) continue;
    try {
      await admin.from("penalties").insert({
        repayment_schedule_id: row.id,
        amount: penaltyAmount,
        reason: "Late payment",
      });
      await admin
        .from("repayment_schedule")
        .update({
          status: "penalized",
          penalty_applied: Number(row.penalty_applied) + penaltyAmount,
          amount_due: Number(row.amount_due) + penaltyAmount,
        })
        .eq("id", row.id);

      await sendAndLog({
        supabaseUrl,
        serviceRoleKey,
        borrowerId: loan.borrower_id,
        phone: loan.borrowers.phone,
        type: "overdue",
        message: `Your installment for ${loanRef(loan.id)} is overdue. A penalty of ${formatKES(penaltyAmount)} has been applied. Please pay as soon as possible.`,
      });
      overdue++;
    } catch (err) {
      errors.push((err as Error).message);
    }
  }

  return new Response(JSON.stringify({ reminders, overdue, errors }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
