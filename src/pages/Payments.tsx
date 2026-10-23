import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
import { PaymentStatusBadge, RecordedBy } from "@/components/payment-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { formatDate, formatKES, pad2 } from "@/lib/format";
import {
  borrowerName,
  channelLabel,
  isIncompleteStk,
  isManualChannel,
  paymentDate,
  paymentRef,
  useAllPayments,
  useBorrowers,
  useLoansForBorrower,
  useMatchPayment,
  useVoidPayment,
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
            {payment ? `${paymentRef(payment) ?? payment.id} · ${formatKES(payment.amount)} from ${payment.phone}` : ""}
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

function VoidDialog({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const voidPayment = useVoidPayment();

  async function confirm() {
    if (!payment || !reason.trim()) return;
    try {
      await voidPayment.mutateAsync({ paymentId: payment.id, reason: reason.trim() });
      toast.success("Payment voided", { description: "The loan balance has been recalculated." });
      setReason("");
      onClose();
    } catch (err) {
      toast.error("Could not void payment", { description: (err as Error).message });
    }
  }

  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Void this payment?</DialogTitle>
          <DialogDescription>
            {payment
              ? `${paymentRef(payment) ?? payment.id} · ${formatKES(payment.amount)}. The amount is taken off the borrower's installments and the loan balance is recalculated. This can't be undone, and the borrower isn't texted.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="void_reason">Reason (kept in the activity log)</Label>
          <Input
            id="void_reason"
            placeholder="e.g. Wrong loan selected"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={voidPayment.isPending || !reason.trim()}
          >
            {voidPayment.isPending ? "Voiding…" : "Void payment"}
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
  const [voiding, setVoiding] = useState<Payment | null>(null);
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";
  const unmatched = (payments ?? []).filter(
    (p) => p.match_status === "unmatched" && !p.voided_at && !isIncompleteStk(p),
  ).length;

  return (
    <AdminLayout>
      <PageHeader eyebrow="Collections" title="Payments" />
      <div className="p-6 md:p-8">
        <Panel title="All payments" meta={`${unmatched} unmatched`}>
          <TableWrap>
            <thead>
              <tr className="border-b">
                <Th>Receipt</Th>
                <Th>Borrower</Th>
                <Th>Method</Th>
                <Th right>Amount</Th>
                <Th>Date</Th>
                <Th>Recorded by</Th>
                <Th right>Status</Th>
                {isSuperAdmin ? <Th right>Action</Th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={isSuperAdmin ? 8 : 7}
                    className="text-muted-foreground px-5 py-8 text-center"
                  >
                    Loading…
                  </td>
                </tr>
              ) : (payments ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={isSuperAdmin ? 8 : 7}
                    className="text-muted-foreground px-5 py-8 text-center"
                  >
                    No payments yet.
                  </td>
                </tr>
              ) : (
                (payments ?? []).map((p) => {
                  const canMatch =
                    isSuperAdmin &&
                    p.match_status === "unmatched" &&
                    !p.voided_at &&
                    !isIncompleteStk(p);
                  const canVoid = isSuperAdmin && isManualChannel(p.channel) && !p.voided_at;
                  return (
                    <tr key={p.id} className={`ledger-row ${p.voided_at ? "opacity-60" : ""}`}>
                      <td className="text-muted-foreground px-5 py-3 font-mono">
                        {paymentRef(p) ?? "—"}
                      </td>
                      <td className="px-5 py-3">{borrowerName(borrowers, p.borrower_id)}</td>
                      <td className="px-5 py-3">
                        <p className="text-xs">{channelLabel(p.channel)}</p>
                        {p.reference && p.channel !== "mpesa_manual" ? (
                          <p className="text-muted-foreground font-mono text-[11px]">
                            {p.reference}
                          </p>
                        ) : null}
                        {p.note ? (
                          <p className="text-muted-foreground max-w-[220px] text-[11px]">
                            {p.note}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {formatKES(p.amount)}
                      </td>
                      <td className="text-muted-foreground px-5 py-3 whitespace-nowrap">
                        {formatDate(paymentDate(p))}
                      </td>
                      <td className="px-5 py-3">
                        <RecordedBy p={p} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <PaymentStatusBadge p={p} />
                      </td>
                      {isSuperAdmin ? (
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {canMatch ? (
                              <Button size="sm" variant="secondary" onClick={() => setMatching(p)}>
                                Match
                              </Button>
                            ) : null}
                            {canVoid ? (
                              <Button size="sm" variant="secondary" onClick={() => setVoiding(p)}>
                                Void
                              </Button>
                            ) : null}
                            {!canMatch && !canVoid ? (
                              <span className="text-muted-foreground text-xs">—</span>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </TableWrap>
        </Panel>
      </div>
      <MatchDialog payment={matching} onClose={() => setMatching(null)} />
      <VoidDialog payment={voiding} onClose={() => setVoiding(null)} />
    </AdminLayout>
  );
}
