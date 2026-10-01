import { Link } from "react-router-dom";
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
import {
  useBorrowers,
  useCreateBorrower,
  useLoansForBorrower,
  loanOutstanding,
  type Borrower,
} from "@/lib/data";

function AddBorrowerDialog() {
  const [open, setOpen] = useState(false);
  const createBorrower = useCreateBorrower();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createBorrower.mutateAsync({
        full_name: String(form.get("full_name")),
        phone: String(form.get("phone")),
        national_id: String(form.get("national_id") || ""),
        email: String(form.get("email") || ""),
      });
      toast.success("Borrower saved");
      setOpen(false);
    } catch (err) {
      toast.error("Could not save borrower", { description: (err as Error).message });
    }
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
              <Input id="phone" name="phone" required placeholder="+254712445901" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="national_id">National ID</Label>
              <Input id="national_id" name="national_id" placeholder="28441902" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="name@example.co.ke" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createBorrower.isPending}>
              {createBorrower.isPending ? "Saving…" : "Save borrower"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BorrowerRow({ id, full_name, phone, national_id }: Borrower) {
  const { data: theirLoans } = useLoansForBorrower(id);
  const loans = theirLoans ?? [];
  const active = loans.filter((l) => l.status === "active").length;
  const owed = loans.reduce((s, l) => s + loanOutstanding(l), 0);

  return (
    <tr className="ledger-row">
      <td className="px-5 py-3">
        <Link to={`/borrowers/${id}`} className="hover:text-coral font-medium">
          {full_name}
        </Link>
      </td>
      <td className="text-muted-foreground px-5 py-3 font-mono">{phone}</td>
      <td className="text-muted-foreground px-5 py-3 font-mono">{national_id ?? "—"}</td>
      <td className="px-5 py-3 text-right font-mono tabular-nums">{active}</td>
      <td className="px-5 py-3 text-right font-mono tabular-nums">{formatKES(owed)}</td>
    </tr>
  );
}

export default function BorrowersIndexPage() {
  const { data: borrowers, isLoading } = useBorrowers();

  return (
    <AdminLayout>
      <PageHeader eyebrow="Book" title="Borrowers" action={<AddBorrowerDialog />} />
      <div className="p-6 md:p-8">
        <Panel title="All borrowers" meta={`${borrowers?.length ?? 0} records`}>
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
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-muted-foreground px-5 py-8 text-center">
                    Loading…
                  </td>
                </tr>
              ) : (
                (borrowers ?? []).map((b) => <BorrowerRow key={b.id} {...b} />)
              )}
            </tbody>
          </TableWrap>
        </Panel>
      </div>
    </AdminLayout>
  );
}
