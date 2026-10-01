import { Link, useParams } from "react-router-dom";
import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatKES } from "@/lib/format";
import {
  useBorrower,
  useLoansForBorrower,
  usePaymentsForBorrower,
  loanOutstanding,
} from "@/lib/data";

export default function BorrowerDetailPage() {
  const { borrowerId } = useParams<{ borrowerId: string }>();
  const { data: borrower, isLoading: borrowerLoading } = useBorrower(borrowerId);
  const { data: theirLoans } = useLoansForBorrower(borrowerId);
  const { data: theirPayments } = usePaymentsForBorrower(borrowerId);

  if (borrowerLoading) {
    return (
      <AdminLayout>
        <PageHeader eyebrow="Book" title="Loading…" />
      </AdminLayout>
    );
  }

  if (!borrower) {
    return (
      <AdminLayout>
        <PageHeader eyebrow="Book" title="Borrower not found" />
      </AdminLayout>
    );
  }

  const loans = theirLoans ?? [];
  const payments = theirPayments ?? [];
  const owed = loans.reduce((s, l) => s + loanOutstanding(l), 0);

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
            <p className="mt-1 font-mono text-sm break-all">{borrower.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">
              National ID
            </p>
            <p className="mt-1 font-mono">{borrower.national_id ?? "—"}</p>
          </div>
        </div>

        <Panel title="Loans" meta={`${loans.length} total`}>
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

        <Panel title="Payment history" meta={`${payments.length} payments`}>
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
              {payments.map((p) => (
                <tr key={p.id} className="ledger-row">
                  <td className="text-muted-foreground px-5 py-3 font-mono">{p.receipt ?? "—"}</td>
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
