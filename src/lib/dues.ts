import type { Installment, Loan } from "./data";

/** Days after the due date before the 1% penalty applies. Matches the daily job. */
export const GRACE_DAYS = 3;
/** How far ahead "coming up" looks. */
export const UPCOMING_DAYS = 7;

/** Today's date as YYYY-MM-DD in the user's own timezone (Nairobi for the lending desk). */
export function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}

function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y!, m! - 1, d!) / 86_400_000);
}

/** Whole days from one date to another (positive when `to` is later). */
export function daysBetween(fromIso: string, toIso: string): number {
  return dayNumber(toIso) - dayNumber(fromIso);
}

/**
 * past_due   more than GRACE_DAYS late (the penalty applies)
 * in_grace   1 to GRACE_DAYS days late
 * due_today  due today
 * upcoming   due within the next UPCOMING_DAYS days
 * later      due after that
 */
export type DueBucket = "past_due" | "in_grace" | "due_today" | "upcoming" | "later";

export interface DueItem {
  loan: Loan;
  installment: Installment;
  installmentCount: number;
  /** What is still unpaid on this installment (penalty included once applied). */
  unpaid: number;
  penalty: number;
  /** Positive: days late. Zero: due today. Negative: days until it's due. */
  daysLate: number;
  bucket: DueBucket;
}

export function isLate(bucket: DueBucket) {
  return bucket === "past_due" || bucket === "in_grace";
}

export function classify(dueDate: string, today: string): { daysLate: number; bucket: DueBucket } {
  const daysLate = daysBetween(dueDate, today);
  let bucket: DueBucket;
  if (daysLate > GRACE_DAYS) bucket = "past_due";
  else if (daysLate >= 1) bucket = "in_grace";
  else if (daysLate === 0) bucket = "due_today";
  else if (daysLate >= -UPCOMING_DAYS) bucket = "upcoming";
  else bucket = "later";
  return { daysLate, bucket };
}

/** Every installment that still has money owing, with how late (or soon) it is. */
export function collectDues(loans: Loan[], today: string): DueItem[] {
  const items: DueItem[] = [];
  for (const loan of loans) {
    for (const installment of loan.schedule) {
      const unpaid = Math.max(installment.amount_due - installment.amount_paid, 0);
      if (unpaid <= 0) continue;
      items.push({
        loan,
        installment,
        installmentCount: loan.schedule.length,
        unpaid,
        penalty: installment.penalty,
        ...classify(installment.due_date, today),
      });
    }
  }
  return items;
}

export interface DueSummary {
  lateAmount: number;
  lateInstallments: number;
  lateLoans: number;
  lateBorrowers: number;
  todayAmount: number;
  todayCount: number;
  upcomingAmount: number;
  upcomingCount: number;
}

export function summarizeDues(items: DueItem[]): DueSummary {
  const late = items.filter((i) => isLate(i.bucket));
  const today = items.filter((i) => i.bucket === "due_today");
  const upcoming = items.filter((i) => i.bucket === "upcoming");
  const sum = (list: DueItem[]) => list.reduce((s, i) => s + i.unpaid, 0);
  return {
    lateAmount: sum(late),
    lateInstallments: late.length,
    lateLoans: new Set(late.map((i) => i.loan.id)).size,
    lateBorrowers: new Set(late.map((i) => i.loan.borrower_id)).size,
    todayAmount: sum(today),
    todayCount: today.length,
    upcomingAmount: sum(upcoming),
    upcomingCount: upcoming.length,
  };
}

/** What one loan is behind by right now (for the Loans list and badges). */
export function loanArrears(loan: Loan, today: string) {
  const late = collectDues([loan], today).filter((i) => isLate(i.bucket));
  return {
    amount: late.reduce((s, i) => s + i.unpaid, 0),
    installments: late.length,
    oldestDays: late.reduce((max, i) => Math.max(max, i.daysLate), 0),
  };
}

export function timingText(daysLate: number) {
  if (daysLate > 0) return `${daysLate} day${daysLate === 1 ? "" : "s"} late`;
  if (daysLate === 0) return "Today";
  const ahead = -daysLate;
  return `In ${ahead} day${ahead === 1 ? "" : "s"}`;
}
