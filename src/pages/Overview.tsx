import { Link } from "react-router-dom";
import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
import { PaymentStatusBadge } from "@/components/payment-status";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatKES, formatShortDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import {
  borrowerName,
  channelLabel,
  loanOutstanding,
  loanTermLabel,
  paymentDate,
  paymentRef,
  staffLabel,
  useBorrowers,
  usePerformance,
  usePortfolioSummary,
} from "@/lib/data";

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

function TeamPerformancePanel() {
  const { isLoading, rows } = usePerformance();
  const active = rows.filter((r) => r.active);

  return (
    <Panel title="Team performance" meta={`${active.length} staff`}>
      <TableWrap>
        <thead>
          <tr className="border-b">
            <Th>Employee</Th>
            <Th right>Clients</Th>
            <Th right>Active loans</Th>
            <Th right>Outstanding</Th>
            <Th right>Collected (month)</Th>
            <Th right>Overdue</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {isLoading ? (
            <tr>
              <td colSpan={6} className="text-muted-foreground px-5 py-8 text-center">
                Loading…
              </td>
            </tr>
          ) : (
            active.map((m) => (
              <tr key={m.id} className="ledger-row">
                <td className="px-5 py-3">
                  {staffLabel(m)}
                  {m.role === "super_admin" ? (
                    <span className="text-muted-foreground ml-2 text-xs">(you)</span>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">{m.clients}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">{m.activeLoans}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">
                  {formatKES(m.outstanding)}
                </td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">
                  {formatKES(m.collectedThisMonth)}
                </td>
                <td
                  className={`px-5 py-3 text-right font-mono tabular-nums ${
                    m.overdueLoans > 0 ? "text-coral" : ""
                  }`}
                >
                  {m.overdueLoans}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>
    </Panel>
  );
}

export default function OverviewPage() {
  const {
    isLoading,
    summary,
    recentPayments,
    matchedCount,
    matchedThisMonthCount,
    totalPaymentsCount,
    loans,
  } = usePortfolioSummary();
  const { role } = useAuth();
  const { data: borrowers } = useBorrowers();

  if (isLoading) {
    return (
      <AdminLayout>
        <PageHeader eyebrow={role === "super_admin" ? "Portfolio Overview" : "My portfolio"} title="Outstanding book & collections" />
        <div className="text-muted-foreground p-8 text-sm">Loading…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        eyebrow={role === "super_admin" ? "Portfolio Overview" : "My portfolio"}
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
            note={`${matchedThisMonthCount} payments matched`}
            tone="teal"
          />
          <Kpi
            label="Overdue loans"
            value={String(summary.overdueLoans)}
            note="Accounts past due"
            tone="coral"
          />
        </div>

        {role === "super_admin" ? <TeamPerformancePanel /> : null}

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
                  <td className="text-muted-foreground px-5 py-3 font-mono">{paymentRef(p) ?? "—"}</td>
                  <td className="px-5 py-3">{borrowerName(borrowers, p.borrower_id)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    {formatKES(p.amount)}
                  </td>
                  <td className="text-muted-foreground px-5 py-3 font-mono text-xs">{channelLabel(p.channel)}</td>
                  <td className="text-muted-foreground px-5 py-3">{formatShortDate(paymentDate(p))}</td>
                  <td className="px-5 py-3 text-right">
                    <PaymentStatusBadge p={p} />
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
                  <td className="text-muted-foreground px-5 py-3">{loanTermLabel(l)}</td>
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
