/**
 * Loan maths for the preview in the app.
 *
 * New loans: 5% of the principal for every week the loan runs, flat, for the
 * whole length of the loan. Installments are whole shillings and the last one
 * absorbs any difference.
 *
 * IMPORTANT: this only previews a loan. The `create_loan` function in the
 * database does the real calculation, so change the rate in BOTH places
 * (WEEKLY_RATE_PERCENT here, c_weekly_rate there).
 */

export const WEEKLY_RATE_PERCENT = 5;
export const MAX_TERM_WEEKS = 104;

export type RepaymentFrequency = "weekly" | "biweekly" | "monthly";

export interface FrequencyInfo {
  value: RepaymentFrequency;
  /** For pickers. */
  label: string;
  /** For use inside a sentence. */
  short: string;
  intervalDays: number;
  /** A "month" is 4 weeks, so every length is a whole number of weeks. */
  periodWeeks: number;
}

export const FREQUENCIES: FrequencyInfo[] = [
  { value: "weekly", label: "Weekly", short: "weekly", intervalDays: 7, periodWeeks: 1 },
  {
    value: "biweekly",
    label: "Every 2 weeks",
    short: "every 2 weeks",
    intervalDays: 14,
    periodWeeks: 2,
  },
  {
    value: "monthly",
    label: "Monthly (every 4 weeks)",
    short: "monthly",
    intervalDays: 28,
    periodWeeks: 4,
  },
];

export function frequencyInfo(value: string): FrequencyInfo {
  return FREQUENCIES.find((f) => f.value === value) ?? FREQUENCIES[0]!;
}

/** Adds days to a YYYY-MM-DD date without any timezone surprises. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface LoanQuote {
  valid: boolean;
  /** Why the inputs can't be used yet; null while nothing has been entered. */
  error: string | null;
  principal: number;
  termWeeks: number;
  frequency: RepaymentFrequency;
  installments: number;
  installmentAmount: number;
  lastInstallmentAmount: number;
  totalInterest: number;
  totalPayable: number;
  totalRatePercent: number;
  intervalDays: number;
}

export function quoteLoan(
  principal: number,
  termWeeks: number,
  frequency: RepaymentFrequency,
): LoanQuote {
  const info = frequencyInfo(frequency);
  const blank: LoanQuote = {
    valid: false,
    error: null,
    principal: 0,
    termWeeks: 0,
    frequency,
    installments: 0,
    installmentAmount: 0,
    lastInstallmentAmount: 0,
    totalInterest: 0,
    totalPayable: 0,
    totalRatePercent: 0,
    intervalDays: info.intervalDays,
  };

  // Nothing (usable) entered yet: no quote and no complaint.
  if (!Number.isFinite(principal) || principal <= 0) return blank;
  if (!Number.isFinite(termWeeks) || termWeeks <= 0) return blank;

  if (!Number.isInteger(principal)) {
    return { ...blank, error: "Enter the amount in whole shillings" };
  }
  if (!Number.isInteger(termWeeks) || termWeeks > MAX_TERM_WEEKS) {
    return {
      ...blank,
      error: `The loan length must be a whole number of weeks, up to ${MAX_TERM_WEEKS}`,
    };
  }
  if (termWeeks % info.periodWeeks !== 0) {
    return {
      ...blank,
      error: `For ${info.short} repayments the length must be a multiple of ${info.periodWeeks} week${
        info.periodWeeks === 1 ? "" : "s"
      }`,
    };
  }

  const installments = termWeeks / info.periodWeeks;
  // Whole-number maths first, so a .5 rounds the same way as in the database.
  const totalInterest = Math.round((principal * WEEKLY_RATE_PERCENT * termWeeks) / 100);
  const totalPayable = principal + totalInterest;
  const installmentAmount = Math.floor(totalPayable / installments);
  if (installmentAmount < 1) {
    return { ...blank, error: `That amount is too small to split into ${installments} installments` };
  }

  return {
    valid: true,
    error: null,
    principal,
    termWeeks,
    frequency,
    installments,
    installmentAmount,
    lastInstallmentAmount: totalPayable - installmentAmount * (installments - 1),
    totalInterest,
    totalPayable,
    totalRatePercent: WEEKLY_RATE_PERCENT * termWeeks,
    intervalDays: info.intervalDays,
  };
}
