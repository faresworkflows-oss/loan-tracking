import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
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
import { formatKES } from "@/lib/format";
import { borrowers, loanOutstanding, loansForBorrower } from "@/lib/mock-data";

export const Route = createFileRoute("/borrowers/")({
  head: () => ({
    meta: [
      { title: "Borrowers — Karamu Lending Desk" },
      {
        name: "description",
        content: "All registered borrowers with active loan counts and total amounts owed.",
      },
      { property: "og:title", content: "Borrowers — Karamu Lending Desk" },
      {
        property: "og:description",
        content: "All registered borrowers with active loan counts and total amounts owed.",
      },
    ],
  }),
  component: BorrowersPage,
});

function AddBorrowerDialog() {
  const [open, setOpen] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // SUPABASE PLACEHOLDER:
    // await supabase.from("borrowers").insert({ full_name, phone, email, national_id });
    toast.success("Borrower saved (demo)", {
      description: "Wire this form to your borrowers table insert.",
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add borrower</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Add borrower</DialogTitle>
          <DialogDescription>Create a new borrower record on the lending desk.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" required placeholder="Wanjiku Mwangi" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" required placeholder="0712 445 901" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="national_id">National ID</Label>
              <Input id="national_id" name="national_id" required placeholder="28441902" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="name@example.co.ke" />
          </div>
          <DialogFooter>
            <Button type="submit">Save borrower</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BorrowersPage() {
  // SUPABASE PLACEHOLDER: supabase.from("borrowers").select("*, loans(*)")
  return (
    <AdminLayout>
      <PageHeader eyebrow="Book" title="Borrowers" action={<AddBorrowerDialog />} />
      <div className="p-6 md:p-8">
        <Panel title="All borrowers" meta={`${borrowers.length} records`}>
          <TableWrap>
            <thead>
              <tr className="border-b">
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>National ID</Th>
                <Th right>Active loans</Th>
                <Th right>Total owed</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {borrowers.map((b) => {
                const theirLoans = loansForBorrower(b.id);
                const active = theirLoans.filter((l) => l.status !== "closed").length;
                const owed = theirLoans.reduce((s, l) => s + loanOutstanding(l), 0);
                return (
                  <tr key={b.id} className="ledger-row">
                    <td className="px-5 py-3">
                      <Link
                        to="/borrowers/$borrowerId"
                        params={{ borrowerId: b.id }}
                        className="hover:text-coral font-medium"
                      >
                        {b.full_name}
                      </Link>
                    </td>
                    <td className="text-muted-foreground px-5 py-3 font-mono">{b.phone}</td>
                    <td className="text-muted-foreground px-5 py-3 font-mono">{b.national_id}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{active}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {formatKES(owed)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </Panel>
      </div>
    </AdminLayout>
  );
}
