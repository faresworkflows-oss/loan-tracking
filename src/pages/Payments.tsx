import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, formatKES, pad2 } from "@/lib/format";
import {
  borrowerName,
  useAllPayments,
  useBorrowers,
  useLoansForBorrower,
  useMatchPayment,
  type Payment,
} from "@/lib/data";

function MatchDialog({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  const [borrowerId, setBorrowerId] = useState("");
  const [selection, setSelection] = useState(""); // `${loanId}:${installmentId}`
  const { data: borrowers } = useBorrowers();
  const { data: theirLoans } = useLoansForBorrower(borrowerId || undefined);
  const matchPayment = useMatchPayment();

  const options = (theirLoans ?? []).flatMap((l) =>
    l.schedule
      .filter((i) => i.amount_paid < i.amount_due)
      .map((i) => ({
        value: `${l.id}:${i.id}`,
        label: `${l.ref} · Installment ${pad2(i.number)} · ${formatKES(i.amount_due)}`,
      })),
  );

  async function confirm() {
    if (!payment || !selection) return;
    const [loanId, installmentId] = selection.split(":") as [string, string];
    try {
      await matchPayment.mutateAsync({ paymentId: payment.id, borrowerId, loanId, installmentId });
      toast.success("Payment matched");
      onClose();
      setBorrowerId("");
      setSelection("");
    } catch (err) {
      toast.error("Could not match payment", { description: (err as Error).message });
    }
  }

  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Match payment</DialogTitle>
          <DialogDescription>
            {payment ? `${payment.receipt ?? payment.id} · ${formatKES(payment.amount)} from ${payment.phone}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Borrower</Label>
            <Select
              value={borrowerId}
              onValueChange={(v) => {
                setBorrowerId(v);
                setSelection("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a borrower" />
              </SelectTrigger>
              <SelectContent>
                {(borrowers ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.full_name} · {b.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Installment</Label>
            <Select value={selection} onValueChange={setSelection} disabled={!borrowerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an open installment" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={confirm} disabled={!selection || matchPayment.isPending}>
            {matchPayment.isPending ? "Matching…" : "Confirm match"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentsPage() {
  const { data: payments, isLoading } = useAllPayments();
  const { data: borrowers } = useBorrowers();
  const [matching, setMatching] = useState<Payment | null>(null);
  const unmatched = (payments ?? []).filter((p) => p.match_status === "unmatched").length;

  return (
    <AdminLayout>
      <PageHeader eyebrow="Collections" title="M-Pesa payments" />
      <div className="p-6 md:p-8">
        <Panel title="All payments" meta={`${unmatched} unmatched`}>
          <TableWrap>
            <thead>
              <tr className="border-b">
                <Th>Receipt</Th>
                <Th>Borrower</Th>
                <Th>Phone</Th>
                <Th right>Amount</Th>
                <Th>Channel</Th>
                <Th>Date</Th>
                <Th right>Status</Th>
                <Th right>Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-muted-foreground px-5 py-8 text-center">
                    Loading…
                  </td>
                </tr>
              ) : (
                (payments ?? []).map((p) => (
                  <tr key={p.id} className="ledger-row">
                    <td className="text-muted-foreground px-5 py-3 font-mono">{p.receipt ?? "—"}</td>
                    <td className="px-5 py-3">{borrowerName(borrowers, p.borrower_id)}</td>
                    <td className="text-muted-foreground px-5 py-3 font-mono">{p.phone}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {formatKES(p.amount)}
                    </td>
                    <td className="text-muted-foreground px-5 py-3 font-mono text-xs">{p.channel}</td>
                    <td className="text-muted-foreground px-5 py-3">{formatDateTime(p.paid_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <StatusBadge status={p.match_status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {p.match_status === "unmatched" ? (
                        <Button size="sm" variant="secondary" onClick={() => setMatching(p)}>
                          Match
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </TableWrap>
        </Panel>
      </div>
      <MatchDialog payment={matching} onClose={() => setMatching(null)} />
    </AdminLayout>
  );
}
