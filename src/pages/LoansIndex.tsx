import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
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
  DialogTrigger,
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
import { formatDate, formatKES } from "@/lib/format";
import {
  FREQUENCIES,
  MAX_TERM_WEEKS,
  WEEKLY_RATE_PERCENT,
  addDays,
  frequencyInfo,
  quoteLoan,
  type RepaymentFrequency,
} from "@/lib/loan-math";
import { useAuth } from "@/lib/auth";
import {
  borrowerName,
  loanOutstanding,
  loanTermLabel,
  staffNameById,
  useBorrowers,
  useCreateLoan,
  useLoans,
  useStaff,
} from "@/lib/data";

function today() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in the user's own timezone
}

function CreateLoanDialog() {
  const [open, setOpen] = useState(false);
  const [borrowerId, setBorrowerId] = useState("");
  const [principal, setPrincipal] = useState("");
  const [frequency, setFrequency] = useState<RepaymentFrequency>("weekly");
  const [weeks, setWeeks] = useState("");
  const [startDate, setStartDate] = useState(today());
  const { data: borrowers } = useBorrowers();
  const createLoan = useCreateLoan();

  const info = frequencyInfo(frequency);
  const quote = useMemo(
    () => quoteLoan(Number(principal), Number(weeks), frequency),
    [principal, weeks, frequency],
  );
  const canSubmit = !!borrowerId && !!startDate && quote.valid;

  function reset() {
    setBorrowerId("");
    setPrincipal("");
    setFrequency("weekly");
    setWeeks("");
    setStartDate(today());
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      const result = await createLoan.mutateAsync({
        borrowerId,
        principal: quote.principal,
        termWeeks: quote.termWeeks,
        frequency,
        startDate,
      });
      toast.success("Loan created", {
        description: `${result.installments} × ${formatKES(result.installmentAmount)}, paid ${info.short}. Total ${formatKES(result.totalPayable)}.`,
      });
      reset();
      setOpen(false);
    } catch (err) {
      toast.error("Could not create loan", { description: (err as Error).message });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>New loan</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Create loan</DialogTitle>
          <DialogDescription>
            Interest is {WEEKLY_RATE_PERCENT}% of the amount lent for every week the loan runs, and
            it doesn't change if the borrower pays off early.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Borrower</Label>
            <Select value={borrowerId} onValueChange={setBorrowerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a borrower" />
              </SelectTrigger>
              <SelectContent>
                {(borrowers ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="principal">Amount to lend (KES)</Label>
              <Input
                id="principal"
                inputMode="numeric"
                placeholder="e.g. 10000"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Start date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payments</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RepaymentFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weeks">Loan length (weeks)</Label>
              <Input
                id="weeks"
                inputMode="numeric"
                placeholder={
                  info.periodWeeks === 1 ? "e.g. 8" : `Multiple of ${info.periodWeeks}, e.g. 8`
                }
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
              />
            </div>
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">
            {info.periodWeeks === 1
              ? `Any length from 1 to ${MAX_TERM_WEEKS} weeks.`
              : `Must be a multiple of ${info.periodWeeks} weeks, up to ${MAX_TERM_WEEKS}.`}
          </p>

          {quote.error ? <p className="text-coral text-sm">{quote.error}</p> : null}

          {quote.valid ? (
            <div className="bg-muted/40 space-y-2 rounded-lg p-4 text-sm ring-1 ring-white/10">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Interest ({WEEKLY_RATE_PERCENT}% × {quote.termWeeks} week
                  {quote.termWeeks === 1 ? "" : "s"})
                </span>
                <span className="font-mono tabular-nums">
                  {quote.totalRatePercent}% · {formatKES(quote.totalInterest)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total payable</span>
                <span className="font-mono tabular-nums">{formatKES(quote.totalPayable)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">
                  {quote.installments} installment{quote.installments === 1 ? "" : "s"}, {info.short}
                </span>
                <span className="font-mono font-bold tabular-nums">
                  {formatKES(quote.installmentAmount)}
                </span>
              </div>
              {quote.lastInstallmentAmount !== quote.installmentAmount ? (
                <p className="text-muted-foreground text-xs">
                  The last installment is {formatKES(quote.lastInstallmentAmount)} so the total
                  comes out exactly.
                </p>
              ) : null}
              {startDate ? (
                <p className="text-muted-foreground text-xs">
                  First due {formatDate(addDays(startDate, quote.intervalDays))}, final due{" "}
                  {formatDate(addDays(startDate, quote.intervalDays * quote.installments))}.
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || createLoan.isPending}>
              {createLoan.isPending ? "Creating…" : "Create loan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LoansIndexPage() {
  const { data: loans, isLoading } = useLoans();
  const { data: borrowers } = useBorrowers();
  const { role } = useAuth();
  const { data: staff } = useStaff();
  const showOfficer = role === "super_admin";

  return (
    <AdminLayout>
      <PageHeader eyebrow="Book" title="Loans" action={<CreateLoanDialog />} />
      <div className="p-6 md:p-8">
        <Panel title="All loans" meta={`${loans?.length ?? 0} total`}>
          <TableWrap>
            <thead>
              <tr className="border-b">
                <Th>Loan</Th>
                <Th>Borrower</Th>
                {showOfficer ? <Th>Assigned to</Th> : null}
                <Th right>Principal</Th>
                <Th right>Balance</Th>
                <Th>Term</Th>
                <Th right>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={showOfficer ? 7 : 6} className="text-muted-foreground px-5 py-8 text-center">
                    Loading…
                  </td>
                </tr>
              ) : (
                (loans ?? []).map((l) => (
                  <tr key={l.id} className="ledger-row">
                    <td className="px-5 py-3">
                      <Link
                        to={`/loans/${l.id}`}
                        className="text-muted-foreground hover:text-coral font-mono"
                      >
                        {l.ref}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{borrowerName(borrowers, l.borrower_id)}</td>
                    {showOfficer ? (
                      <td className="text-muted-foreground px-5 py-3">
                        {staffNameById(
                          staff,
                          borrowers?.find((b) => b.id === l.borrower_id)?.officer_id ?? null,
                        )}
                      </td>
                    ) : null}
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {formatKES(l.principal)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {formatKES(loanOutstanding(l))}
                    </td>
                    <td className="text-muted-foreground px-5 py-3">{loanTermLabel(l)}</td>
                    <td className="px-5 py-3 text-right">
                      <StatusBadge status={l.status} />
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
