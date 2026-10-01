import { Link } from "react-router-dom";
import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatKES, formatShortDate } from "@/lib/format";
import { borrowerName, loanOutstanding, usePortfolioSummary, useBorrowers } from "@/lib/data";

function Kpi({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "teal" | "coral" | "muted";
}) {
  const noteClass =
    tone === "teal" ? "text-teal" : tone === "coral" ? "text-coral" : "text-muted-foreground";
  return (
    <div className="bg-card rounded-xl p-5 ring-1 ring-white/10">
      <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">{label}</p>
      <p
        className={`count-in mt-3 font-mono text-2xl font-bold tracking-tight tabular-nums md:text-3xl ${
          tone === "coral" ? "text-coral" : ""
        }`}
      >
        {value}
      </p>
      <p className={`mt-2 flex items-center gap-1 text-xs ${noteClass}`}>
        {tone === "teal" ? <span className="bg-teal size-1.5 rounded-full" /> : null}
        {note}
      </p>
    </div>
  );
}

export default function OverviewPage() {
  const { isLoading, summary, recentPayments, matchedCount, totalPaymentsCount, loans } =
    usePortfolioSummary();
  const { data: borrowers } = useBorrowers();

  if (isLoading) {
    return (
      <AdminLayout>
        <PageHeader eyebrow="Portfolio Overview" title="Outstanding book & collections" />
        <div className="text-muted-foreground p-8 text-sm">Loading…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Portfolio Overview"
        title="Outstanding book & collections"
        action={
          <Button asChild>
            <Link to="/loans">New loan</Link>
          </Button>
        }
      />

      <div className="space-y-6 p-6 md:p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi
            label="Outstanding"
            value={formatKES(summary.outstanding)}
            note="Live balance"
            tone="teal"
          />
          <Kpi
            label="Total disbursed"
            value={formatKES(summary.disbursed)}
            note={`${summary.loanCount} loans funded`}
          />
          <Kpi
            label="Collections this month"
            value={formatKES(summary.collected)}
            note={`${matchedCount} payments matched`}
            tone="teal"
          />
          <Kpi
            label="Overdue loans"
            value={String(summary.overdueLoans)}
            note="Accounts past due"
            tone="coral"
          />
        </div>

        <Panel title="Recent M-Pesa payments" meta={`matched ${matchedCount} / ${totalPaymentsCount}`}>
          <TableWrap>
            <thead>
              <tr className="border-b">
                <Th>Reference</Th>
                <Th>Borrower</Th>
                <Th right>Amount</Th>
                <Th>Channel</Th>
                <Th>Date</Th>
                <Th right>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentPayments.map((p) => (
                <tr key={p.id} className="ledger-row">
                  <td className="text-muted-foreground px-5 py-3 font-mono">{p.receipt ?? "—"}</td>
                  <td className="px-5 py-3">{borrowerName(borrowers, p.borrower_id)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    {formatKES(p.amount)}
                  </td>
                  <td className="text-muted-foreground px-5 py-3 font-mono text-xs">{p.channel}</td>
                  <td className="text-muted-foreground px-5 py-3">{formatShortDate(p.paid_at)}</td>
                  <td className="px-5 py-3 text-right">
                    <StatusBadge status={p.match_status} />
                  </td>
                </tr>
              ))}
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground px-5 py-8 text-center">
                    No payments yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </TableWrap>
        </Panel>

        <Panel title="Loans" meta={`${loans.length} total`}>
          <TableWrap>
            <thead>
              <tr className="border-b">
                <Th>Loan</Th>
                <Th>Borrower</Th>
                <Th right>Principal</Th>
                <Th right>Outstanding</Th>
                <Th>Term</Th>
                <Th right>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loans.map((l) => (
                <tr key={l.id} className="ledger-row">
                  <td className="px-5 py-3">
                    <Link
                      to={`/loans/${l.id}`}
                      className="text-muted-foreground hover:text-coral font-mono"
                    >
                      {l.ref}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{borrowerName(borrowers, l.borrower_id)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    {formatKES(l.principal)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    {formatKES(loanOutstanding(l))}
                  </td>
                  <td className="text-muted-foreground px-5 py-3">{l.term_months} mo</td>
                  <td className="px-5 py-3 text-right">
                    <StatusBadge status={l.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Panel>
      </div>
    </AdminLayout>
  );
}
