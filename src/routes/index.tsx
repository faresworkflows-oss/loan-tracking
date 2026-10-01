import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatKES, formatShortDate } from "@/lib/format";
import {
  borrowerName,
  loanOutstanding,
  loans,
  payments,
  portfolioSummary,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Portfolio Overview — Karamu Lending Desk" },
      {
        name: "description",
        content:
          "Live outstanding book, disbursements, collections and overdue accounts for the Karamu loan portfolio.",
      },
      { property: "og:title", content: "Portfolio Overview — Karamu Lending Desk" },
      {
        property: "og:description",
        content: "Live outstanding book, disbursements, collections and overdue accounts.",
      },
    ],
  }),
  component: Overview,
});

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

function Overview() {
  // SUPABASE PLACEHOLDER: aggregate from `loans` / `payments`, then subscribe
  // to postgres_changes on both tables to keep these figures realtime.
  const summary = portfolioSummary();
  const recent = [...payments].sort((a, b) => b.paid_at.localeCompare(a.paid_at)).slice(0, 5);
  const matched = payments.filter((p) => p.match_status === "matched").length;

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
            note={`${matched} payments matched`}
            tone="teal"
          />
          <Kpi
            label="Overdue loans"
            value={String(summary.overdueLoans)}
            note="Accounts past due"
            tone="coral"
          />
        </div>

        <Panel
          title="Recent M-Pesa payments"
          meta={`matched ${matched} / ${payments.length}`}
        >
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
              {recent.map((p) => (
                <tr key={p.id} className="ledger-row">
                  <td className="text-muted-foreground px-5 py-3 font-mono">{p.receipt}</td>
                  <td className="px-5 py-3">{borrowerName(p.borrower_id)}</td>
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
                      to="/loans/$loanId"
                      params={{ loanId: l.id }}
                      className="text-muted-foreground hover:text-coral font-mono"
                    >
                      {l.ref}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{borrowerName(l.borrower_id)}</td>
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
