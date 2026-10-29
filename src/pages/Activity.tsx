import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
import { useAuth } from "@/lib/auth";
import { formatDateTime, formatKES } from "@/lib/format";
import {
  channelLabel,
  staffNameById,
  useActivity,
  useBorrowers,
  useStaff,
  type ActivityEntry,
  type Borrower,
  type PaymentChannel,
  type StaffMember,
} from "@/lib/data";

const ACTION_LABELS: Record<string, string> = {
  borrower_created: "Added a client",
  loan_created: "Created a loan",
  stk_push_requested: "Requested an STK push",
  payment_matched: "Matched a payment",
  payment_recorded: "Recorded a payment",
  payment_voided: "Voided a payment",
  staff_created: "Added an employee",
  staff_deactivated: "Deactivated an employee",
  staff_reactivated: "Reactivated an employee",
  clients_reassigned: "Moved clients",
};

const text = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));

function summarize(
  entry: ActivityEntry,
  borrowers: Borrower[] | undefined,
  staff: StaffMember[] | undefined,
) {
  const d = entry.details ?? {};
  switch (entry.action) {
    case "borrower_created": {
      const owner = staff ? ` → ${staffNameById(staff, text(d["assigned_to"]) || null)}` : "";
      return `${text(d["full_name"])}${owner}`;
    }
    case "loan_created": {
      const name = borrowers?.find((b) => b.id === text(d["borrower_id"]))?.full_name ?? "a client";
      const weeks = num(d["term_weeks"]);
      const length = weeks > 0
        ? `${weeks} wk, paid ${text(d["frequency"]) === "biweekly" ? "every 2 weeks" : text(d["frequency"]) || "weekly"}`
        : `${num(d["term_months"])} mo`;
      return `${formatKES(num(d["principal"]))} over ${length} for ${name}`;
    }
    case "payment_recorded": {
      const over = num(d["overpayment"]);
      return `${channelLabel(text(d["method"]) as PaymentChannel)} ${formatKES(num(d["amount"]))} · ${text(d["receipt_no"])}${over > 0 ? ` · overpaid ${formatKES(over)}` : ""}`;
    }
    case "payment_voided":
      return `${formatKES(num(d["amount"]))} · ${text(d["receipt_no"])} — ${text(d["reason"])}`;
    case "stk_push_requested":
    case "payment_matched":
      return formatKES(num(d["amount"]));
    case "staff_created":
    case "staff_deactivated":
      return text(d["full_name"]);
    case "clients_reassigned":
      return `${num(d["count"])} client(s) → ${staffNameById(staff, text(d["to"]) || null)}`;
    default:
      return "";
  }
}

export default function ActivityPage() {
  const { role, session } = useAuth();
  const { data: entries, isLoading } = useActivity();
  const { data: borrowers } = useBorrowers();
  const { data: staff } = useStaff();

  return (
    <AdminLayout>
      <PageHeader
        eyebrow={role === "super_admin" ? "Everyone's actions" : "Your actions"}
        title="Activity"
      />
      <div className="p-6 md:p-8">
        <Panel title="Recent activity" meta={`${entries?.length ?? 0} entries`}>
          <TableWrap>
            <thead>
              <tr className="border-b">
                <Th>When</Th>
                <Th>Who</Th>
                <Th>Action</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-muted-foreground px-5 py-8 text-center">
                    Loading…
                  </td>
                </tr>
              ) : (entries ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted-foreground px-5 py-8 text-center">
                    Nothing recorded yet.
                  </td>
                </tr>
              ) : (
                (entries ?? []).map((e) => (
                  <tr key={e.id} className="ledger-row">
                    <td className="text-muted-foreground px-5 py-3 whitespace-nowrap">
                      {formatDateTime(e.created_at)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {e.actor_id && e.actor_id === session?.user.id ? "You" : (e.actor_name ?? "—")}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {ACTION_LABELS[e.action] ?? e.action}
                    </td>
                    <td className="text-muted-foreground px-5 py-3">
                      {summarize(e, borrowers, staff)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </TableWrap>
        </Panel>
      </div>
    </AdminLayout>
  );
}
