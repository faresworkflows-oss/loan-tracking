import { createFileRoute, Link } from "@tanstack/react-router";
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
import { formatKES } from "@/lib/format";
import { quoteLoan } from "@/lib/loan-math";
import { borrowerName, borrowers, loanOutstanding, loans } from "@/lib/mock-data";

export const Route = createFileRoute("/loans/")({
  head: () => ({
    meta: [
      { title: "Loans — Karamu Lending Desk" },
      {
        name: "description",
        content:
          "Every loan on the book with principal, term, status and outstanding balance at 10% flat annual interest.",
      },
      { property: "og:title", content: "Loans — Karamu Lending Desk" },
      {
        property: "og:description",
        content: "Every loan on the book with principal, term, status and outstanding balance.",
      },
    ],
  }),
  component: LoansPage,
});

function CreateLoanDialog() {
  const [open, setOpen] = useState(false);
  const [borrowerId, setBorrowerId] = useState("");
  const [principal, setPrincipal] = useState("150000");
  const [term, setTerm] = useState("12");

  const quote = useMemo(
    () => quoteLoan(Number(principal), Number(term)),
    [principal, term],
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // SUPABASE PLACEHOLDER:
    // await supabase.rpc("create_loan", { borrower_id, principal, term_months, start_date })
    // — insert the loan then generate its repayment schedule rows.
    toast.success("Loan created (demo)", {
      description: `${formatKES(quote.monthlyInstallment)} / month over ${quote.termMonths} months.`,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New loan</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Create loan</DialogTitle>
          <DialogDescription>
            Interest is 10% flat per annum on the original principal.
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
                {borrowers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="principal">Principal (KES)</Label>
              <Input
                id="principal"
                inputMode="numeric"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term">Term (months)</Label>
              <Input
                id="term"
                inputMode="numeric"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Start date</Label>
              <Input id="start_date" name="start_date" type="date" required />
            </div>
          </div>

          <div className="bg-muted/40 space-y-2 rounded-lg p-4 text-sm ring-1 ring-white/10">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly installment</span>
              <span className="font-mono font-bold tabular-nums">
                {formatKES(quote.monthlyInstallment)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total interest</span>
              <span className="font-mono tabular-nums">{formatKES(quote.totalInterest)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total payable</span>
              <span className="font-mono tabular-nums">{formatKES(quote.totalPayable)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!borrowerId}>
              Create loan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LoansPage() {
  // SUPABASE PLACEHOLDER: supabase.from("loans").select("*, borrowers(full_name)")
  return (
    <AdminLayout>
      <PageHeader eyebrow="Book" title="Loans" action={<CreateLoanDialog />} />
      <div className="p-6 md:p-8">
        <Panel title="All loans" meta={`${loans.length} total`}>
          <TableWrap>
            <thead>
              <tr className="border-b">
                <Th>Loan</Th>
                <Th>Borrower</Th>
                <Th right>Principal</Th>
                <Th right>Balance</Th>
                <Th>Term</Th>
                <Th right>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loans.map((l) => (
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
                  <td className="px-5 py-3">{borrowerName(l.borrower_id)}</td>
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
      </div>
    </AdminLayout>
  );
}
