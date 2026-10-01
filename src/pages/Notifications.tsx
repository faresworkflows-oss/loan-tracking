import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { borrowerName, useBorrowers, useNotifications } from "@/lib/data";

export default function NotificationsPage() {
  const { data: smsLog, isLoading } = useNotifications();
  const { data: borrowers } = useBorrowers();

  return (
    <AdminLayout>
      <PageHeader eyebrow="Notifications" title="SMS log" />
      <div className="p-6 md:p-8">
        <Panel title="Messages sent" meta={`${smsLog?.length ?? 0} entries`}>
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
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-muted-foreground px-5 py-8 text-center">
                    Loading…
                  </td>
                </tr>
              ) : (
                (smsLog ?? []).map((s) => (
                  <tr key={s.id} className="ledger-row">
                    <td className="px-5 py-3 whitespace-nowrap">
                      {borrowerName(borrowers, s.borrower_id)}
                    </td>
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
                ))
              )}
            </tbody>
          </TableWrap>
        </Panel>
      </div>
    </AdminLayout>
  );
}
