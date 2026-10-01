/** Loan maths: 10% flat annual interest on the original principal. */

export const FLAT_ANNUAL_RATE = 0.1;

export interface LoanQuote {
  principal: number;
  termMonths: number;
  totalInterest: number;
  totalPayable: number;
  monthlyInstallment: number;
}

export function quoteLoan(principal: number, termMonths: number): LoanQuote {
  const safePrincipal = Number.isFinite(principal) && principal > 0 ? principal : 0;
  const safeTerm = Number.isFinite(termMonths) && termMonths > 0 ? Math.round(termMonths) : 0;
  const totalInterest = safePrincipal * FLAT_ANNUAL_RATE * (safeTerm / 12);
  const totalPayable = safePrincipal + totalInterest;
  const monthlyInstallment = safeTerm > 0 ? totalPayable / safeTerm : 0;
  return {
    principal: safePrincipal,
    termMonths: safeTerm,
    totalInterest,
    totalPayable,
    monthlyInstallment,
  };
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}
