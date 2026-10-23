import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import { formatKES, pad2 } from "@/lib/format";
import { useRecordPayment, type Loan, type RecordPaymentInput } from "@/lib/data";

type Method = RecordPaymentInput["method"];

const METHODS: {
  value: Method;
  label: string;
  refLabel: string;
  refRequired: boolean;
  refPlaceholder: string;
}[] = [
  {
    value: "cash",
    label: "Cash",
    refLabel: "Receipt book number (optional)",
    refRequired: false,
    refPlaceholder: "e.g. 0457",
  },
  {
    value: "mpesa_manual",
    label: "M-Pesa (entered manually)",
    refLabel: "M-Pesa transaction code",
    refRequired: true,
    refPlaceholder: "e.g. SJK4X9ABCD",
  },
  {
    value: "bank_transfer",
    label: "Bank transfer",
    refLabel: "Bank reference",
    refRequired: true,
    refPlaceholder: "Reference on the bank slip or statement",
  },
  {
    value: "cheque",
    label: "Cheque",
    refLabel: "Cheque number",
    refRequired: true,
    refPlaceholder: "e.g. 000123",
  },
  {
    value: "other",
    label: "Other",
    refLabel: "Reference (optional)",
    refRequired: false,
    refPlaceholder: "Anything that identifies this payment",
  },
];

/** Mirrors the server: fill the oldest unpaid installment first, carry the rest forward. */
function previewAllocation(loan: Loan, amount: number) {
  let remaining = amount;
  const lines: { number: number; apply: number; clears: boolean }[] = [];
  let totalOwed = 0;
  for (const i of loan.schedule) {
    const need = Math.max(i.amount_due - i.amount_paid, 0);
    totalOwed += need;
    if (need <= 0 || remaining <= 0) continue;
    const apply = Math.min(need, remaining);
    lines.push({ number: i.number, apply, clears: apply >= need });
    remaining -= apply;
  }
  return {
    lines,
    overpayment: Math.max(remaining, 0),
    balanceAfter: Math.max(totalOwed - amount, 0),
    clearsLoan: amount >= totalOwed && totalOwed > 0,
  };
}

function today() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in the user's own timezone
}

export function RecordPaymentDialog({
  loan,
  open,
  onOpenChange,
}: {
  loan: Loan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [method, setMethod] = useState<Method>("cash");
  const [amount, setAmount] = useState("");
  const [receivedOn, setReceivedOn] = useState(today());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const recordPayment = useRecordPayment();

  const config = METHODS.find((m) => m.value === method)!;
  const amountNumber = Number(amount);
  const validAmount = Number.isFinite(amountNumber) && amountNumber > 0;
  const preview = useMemo(
    () => (validAmount ? previewAllocation(loan, amountNumber) : null),
    [loan, amountNumber, validAmount],
  );
  const canSubmit =
    validAmount && !!receivedOn && (!config.refRequired || reference.trim().length > 0);

  function reset() {
    setMethod("cash");
    setAmount("");
    setReceivedOn(today());
    setReference("");
    setNote("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      const result = await recordPayment.mutateAsync({
        loanId: loan.id,
        method,
        amount: amountNumber,
        receivedOn,
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.success(`Payment recorded · ${result.receiptNo}`, {
        description: result.loanCleared
          ? "The loan is now fully repaid."
          : `New balance ${formatKES(result.outstanding)}.`,
      });
      if (result.overpayment > 0) {
        toast.warning(`Overpayment of ${formatKES(result.overpayment)}`, {
          description: "This was more than the balance. It's flagged on the payment.",
        });
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not record payment", { description: (err as Error).message });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Record payment · {loan.ref}</DialogTitle>
          <DialogDescription>
            For money received outside the automatic M-Pesa flow. The borrower is texted a
            confirmation and the entry is logged under your name.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rp_amount">Amount (KES)</Label>
              <Input
                id="rp_amount"
                inputMode="decimal"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp_date">Date received</Label>
              <Input
                id="rp_date"
                type="date"
                max={today()}
                value={receivedOn}
                onChange={(e) => setReceivedOn(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rp_ref">{config.refLabel}</Label>
            <Input
              id="rp_ref"
              placeholder={config.refPlaceholder}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rp_note">Note (optional)</Label>
            <Input
              id="rp_note"
              placeholder="Anything worth remembering about this payment"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {preview ? (
            <div className="bg-muted/40 space-y-2 rounded-lg p-4 text-sm ring-1 ring-white/10">
              <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">
                How this will be applied
              </p>
              {preview.lines.map((l) => (
                <div key={l.number} className="flex justify-between">
                  <span>
                    Installment {pad2(l.number)}
                    {l.clears ? (
                      <span className="text-teal ml-2 text-xs">cleared</span>
                    ) : (
                      <span className="text-muted-foreground ml-2 text-xs">part payment</span>
                    )}
                  </span>
                  <span className="font-mono tabular-nums">{formatKES(l.apply)}</span>
                </div>
              ))}
              {preview.overpayment > 0 ? (
                <div className="text-coral flex justify-between">
                  <span>Overpayment (more than the balance)</span>
                  <span className="font-mono tabular-nums">{formatKES(preview.overpayment)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Balance after</span>
                <span className="font-mono font-bold tabular-nums">
                  {formatKES(preview.balanceAfter)}
                </span>
              </div>
              {preview.clearsLoan ? (
                <p className="text-teal text-xs">
                  This clears the loan, so the borrower also gets a “loan cleared” text.
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || recordPayment.isPending}>
              {recordPayment.isPending ? "Recording…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
