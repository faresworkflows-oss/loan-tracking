import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { borrowerName, staffNameById, useBorrowers, useLoans, useStaff } from "@/lib/data";
import {
  collectDues,
  isLate,
  summarizeDues,
  timingText,
  todayLocal,
  type DueBucket,
  type DueItem,
} from "@/lib/dues";
import { formatDate, formatKES, pad2 } from "@/lib/format";

type Filter = "late" | "today" | "week" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "late", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "week", label: "Coming up" },
  { value: "all", label: "All unpaid" },
];

function inFilter(item: DueItem, filter: Filter) {
  if (filter === "late") return isLate(item.bucket);
  if (filter === "today") return item.bucket === "due_today";
  if (filter === "week") return item.bucket === "upcoming";
  return true;
}

function badgeStatus(bucket: DueBucket) {
  return bucket === "later" ? "pending" : bucket;
}

function Card({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "coral";
}) {
  return (
    <div className="bg-card rounded-xl p-5 ring-1 ring-white/10">
      <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">{label}</p>
      <p
        className={`mt-3 font-mono text-2xl font-bold tracking-tight tabular-nums md:text-3xl ${
          tone === "coral" ? "text-coral" : ""
        }`}
      >
        {value}
      </p>
      <p className="text-muted-foreground mt-2 text-xs">{note}</p>
    </div>
  );
}

const EMPTY: Record<Filter, string> = {
  late: "Nothing is overdue right now.",
  today: "Nothing is due today.",
  week: "Nothing is due in the next 7 days.",
  all: "Nothing is unpaid.",
};

export default function DuesPage() {
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";
  const { data: loans, isLoading } = useLoans();
  const { data: borrowers } = useBorrowers();
  const { data: staff } = useStaff();
  const [filter, setFilter] = useState<Filter>("late");

  const today = todayLocal();
  const all = useMemo(() => collectDues(loans ?? [], today), [loans, today]);
  const summary = useMemo(() => summarizeDues(all), [all]);

  const counts = useMemo(() => {
    const result = {} as Record<Filter, number>;
    for (const f of FILTERS) result[f.value] = all.filter((i) => inFilter(i, f.value)).length;
    return result;
  }, [all]);

  const rows = useMemo(() => {
    const list = all.filter((i) => inFilter(i, filter));
    return list.sort((a, b) =>
      filter === "late"
        ? b.daysLate - a.daysLate || b.unpaid - a.unpaid // most overdue first
        : a.installment.due_date.localeCompare(b.installment.due_date) || b.unpaid - a.unpaid,
    );
  }, [all, filter]);

  const total = rows.reduce((sum, r) => sum + r.unpaid, 0);
  const columnCount = isSuperAdmin ? 10 : 9;

  return (
    <AdminLayout>
      <PageHeader eyebrow="Collections" title="Dues" />
      <div className="space-y-6 p-6 md:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card
            label="Overdue"
            value={formatKES(summary.lateAmount)}
            note={`${summary.lateInstallments} installment${
              summary.lateInstallments === 1 ? "" : "s"
            } · ${summary.lateBorrowers} borrower${summary.lateBorrowers === 1 ? "" : "s"}`}
            tone="coral"
          />
          <Card
            label="Due today"
            value={formatKES(summary.todayAmount)}
            note={`${summary.todayCount} installment${summary.todayCount === 1 ? "" : "s"}`}
          />
          <Card
            label="Coming up (7 days)"
            value={formatKES(summary.upcomingAmount)}
            note={`${summary.upcomingCount} installment${summary.upcomingCount === 1 ? "" : "s"}`}
          />
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="bg-transparent p-0">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label} ({counts[f.value]})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Panel
          title={FILTERS.find((f) => f.value === filter)!.label}
          meta={`${rows.length} installment${rows.length === 1 ? "" : "s"} · ${formatKES(total)}`}
        >
          <TableWrap>
            <thead>
              <tr className="border-b">
                <Th>Borrower</Th>
                <Th>Phone</Th>
                <Th>Loan</Th>
                <Th>Installment</Th>
                <Th>Due date</Th>
                <Th>Timing</Th>
                <Th right>Unpaid</Th>
                <Th right>Penalty</Th>
                {isSuperAdmin ? <Th>Assigned to</Th> : null}
                <Th right>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={columnCount} className="text-muted-foreground px-5 py-8 text-center">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="text-muted-foreground px-5 py-8 text-center">
                    {EMPTY[filter]}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const borrower = (borrowers ?? []).find((b) => b.id === r.loan.borrower_id);
                  const late = isLate(r.bucket);
                  return (
                    <tr key={`${r.loan.id}-${r.installment.id}`} className="ledger-row">
                      <td className="px-5 py-3">
                        <Link
                          to={`/borrowers/${r.loan.borrower_id}`}
                          className="hover:text-coral font-medium"
                        >
                          {borrowerName(borrowers, r.loan.borrower_id)}
                        </Link>
                      </td>
                      <td className="text-muted-foreground px-5 py-3 font-mono">
                        {borrower?.phone ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          to={`/loans/${r.loan.id}`}
                          className="text-muted-foreground hover:text-coral font-mono"
                        >
                          {r.loan.ref}
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-mono">
                        {pad2(r.installment.number)} / {pad2(r.installmentCount)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {formatDate(r.installment.due_date)}
                      </td>
                      <td
                        className={`px-5 py-3 whitespace-nowrap ${
                          r.bucket === "past_due" ? "text-coral font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {timingText(r.daysLate)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-mono tabular-nums ${
                          late ? "text-coral" : ""
                        }`}
                      >
                        {formatKES(r.unpaid)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {r.penalty > 0 ? (
                          formatKES(r.penalty)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {isSuperAdmin ? (
                        <td className="text-muted-foreground px-5 py-3">
                          {staffNameById(staff, borrower?.officer_id ?? null)}
                        </td>
                      ) : null}
                      <td className="px-5 py-3 text-right">
                        <StatusBadge status={badgeStatus(r.bucket)} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </TableWrap>
        </Panel>
      </div>
    </AdminLayout>
  );
}
