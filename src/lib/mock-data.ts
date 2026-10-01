/**
 * ─────────────────────────────────────────────────────────────────────────
 * SUPABASE PLACEHOLDER DATA
 * ─────────────────────────────────────────────────────────────────────────
 * Every export here stands in for a Supabase query. Replace each `get*`
 * helper with a real call, e.g.
 *
 *   const { data } = await supabase.from("borrowers").select("*");
 *
 * and subscribe to changes with:
 *
 *   supabase.channel("loans").on("postgres_changes", { event: "*",
 *     schema: "public", table: "loans" }, handler).subscribe();
 *
 * The shapes below match the intended table columns.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { addMonths, quoteLoan } from "./loan-math";

export type InstallmentStatus = "pending" | "paid" | "late" | "penalized";
export type LoanStatus = "active" | "late" | "penalized" | "closed";
export type MatchStatus = "matched" | "unmatched";
export type SmsType = "reminder" | "overdue" | "payment_received";

export interface Borrower {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  national_id: string;
}

export interface Installment {
  number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: InstallmentStatus;
}

export interface Penalty {
  id: string;
  loan_id: string;
  installment_number: number;
  amount: number;
  reason: string;
  charged_at: string;
}

export interface Loan {
  id: string;
  ref: string;
  borrower_id: string;
  principal: number;
  term_months: number;
  start_date: string;
  status: LoanStatus;
  schedule: Installment[];
}

export interface Payment {
  id: string;
  receipt: string;
  borrower_id: string | null;
  loan_id: string | null;
  installment_number: number | null;
  amount: number;
  channel: "STK" | "C2B";
  phone: string;
  paid_at: string;
  match_status: MatchStatus;
}

export interface SmsLogEntry {
  id: string;
  borrower_id: string;
  type: SmsType;
  message: string;
  status: "sent" | "delivered" | "failed";
  sent_at: string;
}

export const borrowers: Borrower[] = [
  {
    id: "b1",
    full_name: "Wanjiku Mwangi",
    phone: "0712 445 901",
    email: "wanjiku.m@example.co.ke",
    national_id: "28441902",
  },
  {
    id: "b2",
    full_name: "Otieno Kamau",
    phone: "0722 300 774",
    email: "otieno.k@example.co.ke",
    national_id: "31029877",
  },
  {
    id: "b3",
    full_name: "Achieng Odhiambo",
    phone: "0700 902 118",
    email: "achieng.o@example.co.ke",
    national_id: "29887410",
  },
  {
    id: "b4",
    full_name: "Mwangi Daniel",
    phone: "0733 118 220",
    email: "mwangi.d@example.co.ke",
    national_id: "33471009",
  },
  {
    id: "b5",
    full_name: "Njeri Akinyi",
    phone: "0745 882 310",
    email: "njeri.a@example.co.ke",
    national_id: "30118442",
  },
];

function buildSchedule(
  principal: number,
  term: number,
  startDate: string,
  paidCount: number,
  trailing: InstallmentStatus = "pending",
): Installment[] {
  const { monthlyInstallment } = quoteLoan(principal, term);
  return Array.from({ length: term }, (_, i) => {
    const paid = i < paidCount;
    return {
      number: i + 1,
      due_date: addMonths(startDate, i + 1),
      amount_due: Math.round(monthlyInstallment),
      amount_paid: paid ? Math.round(monthlyInstallment) : 0,
      status: paid ? "paid" : i === paidCount ? trailing : "pending",
    } satisfies Installment;
  });
}

export const loans: Loan[] = [
  {
    id: "l1",
    ref: "LN-2026-0881",
    borrower_id: "b1",
    principal: 150_000,
    term_months: 12,
    start_date: "2026-01-01",
    status: "active",
    schedule: buildSchedule(150_000, 12, "2026-01-01", 5),
  },
  {
    id: "l2",
    ref: "LN-2026-0879",
    borrower_id: "b2",
    principal: 300_000,
    term_months: 24,
    start_date: "2025-09-01",
    status: "late",
    schedule: buildSchedule(300_000, 24, "2025-09-01", 9, "late"),
  },
  {
    id: "l3",
    ref: "LN-2026-0875",
    borrower_id: "b3",
    principal: 75_000,
    term_months: 6,
    start_date: "2026-02-01",
    status: "penalized",
    schedule: buildSchedule(75_000, 6, "2026-02-01", 3, "penalized"),
  },
  {
    id: "l4",
    ref: "LN-2025-0870",
    borrower_id: "b4",
    principal: 50_000,
    term_months: 6,
    start_date: "2025-03-01",
    status: "closed",
    schedule: buildSchedule(50_000, 6, "2025-03-01", 6),
  },
  {
    id: "l5",
    ref: "LN-2026-0890",
    borrower_id: "b5",
    principal: 220_000,
    term_months: 18,
    start_date: "2026-04-01",
    status: "active",
    schedule: buildSchedule(220_000, 18, "2026-04-01", 2),
  },
];

export const penalties: Penalty[] = [
  {
    id: "p1",
    loan_id: "l3",
    installment_number: 4,
    amount: 1_250,
    reason: "Installment 14 days overdue",
    charged_at: "2026-06-15",
  },
  {
    id: "p2",
    loan_id: "l2",
    installment_number: 10,
    amount: 3_000,
    reason: "Installment 7 days overdue",
    charged_at: "2026-07-08",
  },
];

export const payments: Payment[] = [
  {
    id: "pay1",
    receipt: "QK8F2L9A",
    borrower_id: "b1",
    loan_id: "l1",
    installment_number: 5,
    amount: 13_750,
    channel: "STK",
    phone: "0712 445 901",
    paid_at: "2026-06-12T08:14:00Z",
    match_status: "matched",
  },
  {
    id: "pay2",
    receipt: "QK8F2L9B",
    borrower_id: "b2",
    loan_id: "l2",
    installment_number: 9,
    amount: 13_750,
    channel: "STK",
    phone: "0722 300 774",
    paid_at: "2026-06-12T07:52:00Z",
    match_status: "matched",
  },
  {
    id: "pay3",
    receipt: "QK8F2L9C",
    borrower_id: null,
    loan_id: null,
    installment_number: null,
    amount: 2_750,
    channel: "C2B",
    phone: "0700 902 118",
    paid_at: "2026-06-11T17:30:00Z",
    match_status: "unmatched",
  },
  {
    id: "pay4",
    receipt: "QK8F2L9D",
    borrower_id: null,
    loan_id: null,
    installment_number: null,
    amount: 8_300,
    channel: "C2B",
    phone: "0733 118 220",
    paid_at: "2026-06-11T06:48:00Z",
    match_status: "unmatched",
  },
  {
    id: "pay5",
    receipt: "QK8F2L8Z",
    borrower_id: "b5",
    loan_id: "l5",
    installment_number: 2,
    amount: 13_139,
    channel: "STK",
    phone: "0745 882 310",
    paid_at: "2026-06-10T11:02:00Z",
    match_status: "matched",
  },
];

export const smsLog: SmsLogEntry[] = [
  {
    id: "s1",
    borrower_id: "b1",
    type: "payment_received",
    message: "We have received KES 13,750 for loan LN-2026-0881. Thank you.",
    status: "delivered",
    sent_at: "2026-06-12T08:15:00Z",
  },
  {
    id: "s2",
    borrower_id: "b2",
    type: "overdue",
    message: "Your installment of KES 13,750 is 7 days overdue. A penalty has been applied.",
    status: "delivered",
    sent_at: "2026-06-11T09:00:00Z",
  },
  {
    id: "s3",
    borrower_id: "b3",
    type: "reminder",
    message: "Reminder: KES 13,125 is due on 01 Jul 2026 for loan LN-2026-0875.",
    status: "sent",
    sent_at: "2026-06-10T09:00:00Z",
  },
  {
    id: "s4",
    borrower_id: "b5",
    type: "reminder",
    message: "Reminder: KES 13,139 is due on 01 Jul 2026 for loan LN-2026-0890.",
    status: "failed",
    sent_at: "2026-06-09T09:00:00Z",
  },
];

/* ── Derived helpers (replace with Supabase queries / views) ────────────── */

export function getBorrower(id: string) {
  return borrowers.find((b) => b.id === id);
}

export function borrowerName(id: string | null) {
  if (!id) return "Unassigned";
  return getBorrower(id)?.full_name ?? "Unknown";
}

export function getLoan(id: string) {
  return loans.find((l) => l.id === id);
}

export function loanOutstanding(loan: Loan) {
  return loan.schedule.reduce((sum, i) => sum + (i.amount_due - i.amount_paid), 0);
}

export function loanPaid(loan: Loan) {
  return loan.schedule.reduce((sum, i) => sum + i.amount_paid, 0);
}

export function loansForBorrower(id: string) {
  return loans.filter((l) => l.borrower_id === id);
}

export function paymentsForLoan(id: string) {
  return payments.filter((p) => p.loan_id === id);
}

export function paymentsForBorrower(id: string) {
  return payments.filter((p) => p.borrower_id === id);
}

export function penaltiesForLoan(id: string) {
  return penalties.filter((p) => p.loan_id === id);
}

export function nextInstallment(loan: Loan) {
  return loan.schedule.find((i) => i.amount_paid < i.amount_due);
}

export function portfolioSummary() {
  const outstanding = loans.reduce((s, l) => s + loanOutstanding(l), 0);
  const disbursed = loans.reduce((s, l) => s + l.principal, 0);
  const collected = payments.reduce((s, p) => s + (p.match_status === "matched" ? p.amount : 0), 0);
  const overdueLoans = loans.filter((l) => l.status === "late" || l.status === "penalized").length;
  return { outstanding, disbursed, collected, overdueLoans, loanCount: loans.length };
}

/** The signed-in borrower for the portal — replace with the Supabase session user. */
export const currentBorrowerId = "b1";
