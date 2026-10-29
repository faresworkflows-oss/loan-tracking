import { PortalLayout } from "@/components/portal-layout";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatKES, pad2 } from "@/lib/format";
import {
  channelLabel,
  loanRateSummary,
  loanTotalInterest,
  paymentDate,
  paymentRef,
  useCurrentBorrower,
  useLoansForBorrower,
  usePaymentsForLoan,
} from "@/lib/data";

export default function PortalStatementPage() {
  const { data: borrower, isLoading: borrowerLoading } = useCurrentBorrower();
  const { data: loans, isLoading: loansLoading } = useLoansForBorrower(borrower?.id);
  const loan = (loans ?? [])[0];
  const { data: loanPayments } = usePaymentsForLoan(loan?.id);

  if (borrowerLoading || loansLoading) {
    return (
      <PortalLayout borrowerName="…">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </PortalLayout>
    );
  }

  if (!borrower || !loan) {
    return (
      <PortalLayout borrowerName={borrower?.full_name ?? "—"}>
        <p className="text-muted-foreground text-sm">No loan statement available yet.</p>
      </PortalLayout>
    );
  }

  // Only payments that were actually applied; unfinished STK pushes are hidden.
  const payments = (loanPayments ?? []).filter((p) => p.match_status === "matched");

  let running = loan.total_payable;
  const rows = loan.schedule.map((i) => {
    running -= i.amount_paid;
    return { ...i, balance: running };
  });

  return (
    <PortalLayout borrowerName={borrower.full_name}>
      <h1 className="font-display text-2xl leading-tight font-semibold text-balance">Statement</h1>
      <p className="text-muted-foreground mt-1 font-mono text-xs">{loan.ref}</p>

      <div className="bg-card mt-5 rounded-xl p-5 ring-1 ring-white/10">
        <p className="text-muted-foreground mb-3 text-[11px] tracking-[0.15em] uppercase">
          Interest breakdown
        </p>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Principal</span>
            <span className="font-mono tabular-nums">{formatKES(loan.principal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Interest ({loanRateSummary(loan)})
            </span>
            <span className="text-gold font-mono tabular-nums">
              {formatKES(loanTotalInterest(loan))}
            </span>
          </div>
          <div className="flex justify-between border-t pt-3">
            <span className="font-medium">Total payable</span>
            <span className="font-mono font-bold tabular-nums">
              {formatKES(loan.total_payable)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-card mt-4 overflow-hidden rounded-xl ring-1 ring-white/10">
        <div className="border-b px-5 py-4">
          <h2 className="font-display text-base font-semibold">Repayment schedule</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-[11px] tracking-[0.12em] uppercase">
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3 text-right font-medium">Balance</th>
                <th className="px-5 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((i) => (
                <tr key={i.id} className="ledger-row">
                  <td className="px-5 py-3 font-mono">{pad2(i.number)}</td>
                  <td className="px-5 py-3 whitespace-nowrap">{formatDate(i.due_date)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    {formatKES(i.amount_due)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    {formatKES(i.balance)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <StatusBadge status={i.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card mt-4 rounded-xl p-5 ring-1 ring-white/10">
        <p className="text-muted-foreground mb-3 text-[11px] tracking-[0.15em] uppercase">
          Payments received
        </p>
        <div className="space-y-3">
          {payments.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between ${p.voided_at ? "opacity-50" : ""}`}
            >
              <div>
                <p className="font-mono text-sm leading-none">{paymentRef(p) ?? "—"}</p>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  {formatDate(paymentDate(p))} · {channelLabel(p.channel)}
                  {p.voided_at ? " · reversed" : ""}
                </p>
              </div>
              <span
                className={`font-mono text-sm tabular-nums ${
                  p.voided_at ? "text-muted-foreground line-through" : "text-teal"
                }`}
              >
                {formatKES(p.amount)}
              </span>
            </div>
          ))}
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No receipts yet.</p>
          ) : null}
        </div>
      </div>
    </PortalLayout>
  );
}
