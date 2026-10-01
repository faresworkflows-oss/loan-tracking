import { createFileRoute, Link } from "@tanstack/react-router";
import { PortalLayout } from "@/components/portal-layout";
import { formatDate, formatKES, pad2 } from "@/lib/format";
import { quoteLoan } from "@/lib/loan-math";
import {
  currentBorrowerId,
  getBorrower,
  loanOutstanding,
  loansForBorrower,
  nextInstallment,
} from "@/lib/mock-data";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "My loan — Karamu Borrower Portal" },
      {
        name: "description",
        content: "Your outstanding balance, next payment due and loan summary at a glance.",
      },
      { property: "og:title", content: "My loan — Karamu Borrower Portal" },
      {
        property: "og:description",
        content: "Your outstanding balance, next payment due and loan summary at a glance.",
      },
    ],
  }),
  component: PortalDashboard,
});

function PortalDashboard() {
  // SUPABASE PLACEHOLDER: resolve the borrower from supabase.auth.getUser(), then
  // select their loan + schedule and subscribe to realtime balance changes.
  const borrower = getBorrower(currentBorrowerId)!;
  const loan = loansForBorrower(borrower.id)[0]!;
  const outstanding = loanOutstanding(loan);
  const next = nextInstallment(loan);
  const quote = quoteLoan(loan.principal, loan.term_months);
  const paidCount = loan.schedule.filter((i) => i.amount_paid >= i.amount_due).length;

  return (
    <PortalLayout borrowerName={borrower.full_name}>
      <div className="grain from-coral to-coral/70 text-ink relative overflow-hidden rounded-2xl bg-gradient-to-br p-6">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-70">
          Outstanding balance
        </p>
        <p className="count-in mt-2 font-mono text-4xl font-bold tracking-tight tabular-nums">
          {formatKES(outstanding)}
        </p>
        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] tracking-[0.15em] uppercase opacity-70">Next payment</p>
            <p className="font-mono text-xl font-bold tabular-nums">
              {next ? formatKES(next.amount_due) : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] tracking-[0.15em] uppercase opacity-70">Due</p>
            <p className="font-mono text-xl font-bold">
              {next ? formatDate(next.due_date) : "Cleared"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card mt-4 rounded-xl p-5 ring-1 ring-white/10">
        <p className="text-muted-foreground mb-3 text-[11px] tracking-[0.15em] uppercase">
          Loan summary
        </p>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Principal</span>
            <span className="font-mono tabular-nums">{formatKES(loan.principal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Interest rate</span>
            <span className="font-mono tabular-nums">10% flat p.a.</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Term</span>
            <span className="font-mono tabular-nums">{loan.term_months} months</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total payable</span>
            <span className="font-mono tabular-nums">{formatKES(quote.totalPayable)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono tabular-nums">
              {paidCount} / {loan.term_months} paid
            </span>
          </div>
        </div>
        <div className="bg-muted mt-4 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-teal h-full rounded-full"
            style={{ width: `${(paidCount / loan.term_months) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-card mt-4 rounded-xl p-5 ring-1 ring-white/10">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">
            Recent installments
          </p>
          <Link to="/portal/statement" className="text-teal font-mono text-xs">
            full statement →
          </Link>
        </div>
        <div className="space-y-3">
          {loan.schedule
            .filter((i) => i.amount_paid > 0)
            .slice(-3)
            .reverse()
            .map((i) => (
              <div key={i.number} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="bg-teal/15 text-teal grid size-8 shrink-0 place-items-center rounded-full font-mono text-xs font-bold">
                    {pad2(i.number)}
                  </span>
                  <div>
                    <p className="text-sm leading-none font-medium">Installment {pad2(i.number)}</p>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      {formatDate(i.due_date)}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm tabular-nums">{formatKES(i.amount_paid)}</span>
              </div>
            ))}
        </div>
      </div>
    </PortalLayout>
  );
}
