import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { borrowerName, smsLog } from "@/lib/mock-data";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "SMS Log — Karamu Lending Desk" },
      {
        name: "description",
        content: "Every reminder, overdue notice and payment receipt SMS sent to borrowers.",
      },
      { property: "og:title", content: "SMS Log — Karamu Lending Desk" },
      {
        property: "og:description",
        content: "Every reminder, overdue notice and payment receipt SMS sent to borrowers.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  // SUPABASE PLACEHOLDER: supabase.from("sms_log").select("*").order("sent_at", { ascending: false })
  return (
    <AdminLayout>
      <PageHeader eyebrow="Notifications" title="SMS log" />
      <div className="p-6 md:p-8">
        <Panel title="Messages sent" meta={`${smsLog.length} entries`}>
          <TableWrap>
            <thead>
              <tr className="border-b">
                <Th>Borrower</Th>
                <Th>Type</Th>
                <Th>Message</Th>
                <Th>Sent</Th>
                <Th right>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {smsLog.map((s) => (
                <tr key={s.id} className="ledger-row">
                  <td className="px-5 py-3 whitespace-nowrap">{borrowerName(s.borrower_id)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={s.type} />
                  </td>
                  <td className="text-muted-foreground max-w-[420px] px-5 py-3">{s.message}</td>
                  <td className="text-muted-foreground px-5 py-3 whitespace-nowrap">
                    {formatDateTime(s.sent_at)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <StatusBadge status={s.status} />
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
