import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatKES } from "@/lib/format";
import {
  getBorrower,
  loanOutstanding,
  loansForBorrower,
  paymentsForBorrower,
} from "@/lib/mock-data";

export const Route = createFileRoute("/borrowers/$borrowerId")({
  head: () => ({
    meta: [
      { title: "Borrower detail — Karamu Lending Desk" },
      { name: "description", content: "Loans and payment history for a single borrower." },
      { property: "og:title", content: "Borrower detail — Karamu Lending Desk" },
      { property: "og:description", content: "Loans and payment history for a single borrower." },
    ],
  }),
  component: BorrowerDetail,
  notFoundComponent: () => (
    <AdminLayout>
      <PageHeader eyebrow="Book" title="Borrower not found" />
    </AdminLayout>
  ),
});

function BorrowerDetail() {
  const { borrowerId } = Route.useParams();
  // SUPABASE PLACEHOLDER: supabase.from("borrowers").select("*").eq("id", borrowerId).single()
  const borrower = getBorrower(borrowerId);
  if (!borrower) throw notFound();

  const theirLoans = loansForBorrower(borrower.id);
  const theirPayments = paymentsForBorrower(borrower.id);
  const owed = theirLoans.reduce((s, l) => s + loanOutstanding(l), 0);

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Borrower detail"
        title={borrower.full_name}
        action={
          <div className="text-right">
            <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">
              Total owed
            </p>
            <p className="font-mono text-2xl font-bold tracking-tight tabular-nums">
              {formatKES(owed)}
            </p>
          </div>
        }
      />

      <div className="space-y-6 p-6 md:p-8">
        <div className="bg-card grid gap-4 rounded-xl p-5 ring-1 ring-white/10 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">Phone</p>
            <p className="mt-1 font-mono">{borrower.phone}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">Email</p>
            <p className="mt-1 font-mono text-sm break-all">{borrower.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">
              National ID
            </p>
            <p className="mt-1 font-mono">{borrower.national_id}</p>
          </div>
        </div>

        <Panel title="Loans" meta={`${theirLoans.length} total`}>
          <TableWrap>
            <thead>
              <tr className="border-b">
                <Th>Loan</Th>
                <Th right>Principal</Th>
                <Th right>Outstanding</Th>
                <Th>Term</Th>
                <Th right>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {theirLoans.map((l) => (
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

        <Panel title="Payment history" meta={`${theirPayments.length} payments`}>
          <TableWrap>
            <thead>
              <tr className="border-b">
                <Th>Receipt</Th>
                <Th right>Amount</Th>
                <Th>Channel</Th>
                <Th>Date</Th>
                <Th right>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {theirPayments.map((p) => (
                <tr key={p.id} className="ledger-row">
                  <td className="text-muted-foreground px-5 py-3 font-mono">{p.receipt}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    {formatKES(p.amount)}
                  </td>
                  <td className="text-muted-foreground px-5 py-3 font-mono text-xs">{p.channel}</td>
                  <td className="text-muted-foreground px-5 py-3">{formatDateTime(p.paid_at)}</td>
                  <td className="px-5 py-3 text-right">
                    <StatusBadge status={p.match_status} />
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
