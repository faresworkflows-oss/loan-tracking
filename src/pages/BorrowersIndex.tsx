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
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const createBorrower = useCreateBorrower();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    try {
      const result = await createBorrower.mutateAsync({
        full_name: String(form.get("full_name")),
        phone: String(form.get("phone")),
        national_id: String(form.get("national_id") || ""),
        email,
      });
      setIssued({ email, password: result.temp_password });
    } catch (err) {
      toast.error("Could not save borrower", { description: (err as Error).message });
    }
  }

  function handleClose(next: boolean) {
    setOpen(next);
    if (!next) setIssued(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>Add borrower</Button>
      </DialogTrigger>
      <DialogContent>
        {issued ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Borrower created</DialogTitle>
              <DialogDescription>
                Share these login details with the borrower — the password is shown only once
                and can't be retrieved again. Generate a new one from the borrower's detail page
                if it's lost.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted/40 space-y-2 rounded-lg p-4 text-sm ring-1 ring-white/10">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Login email</span>
                <span className="font-mono">{issued.email}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Temporary password</span>
                <span className="font-mono font-bold">{issued.password}</span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Add borrower</DialogTitle>
              <DialogDescription>
                Creates the borrower record and a portal login for them. Email is required since
                it's used to sign in.
              </DialogDescription>
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
                <Label htmlFor="email">Email (used to log in)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.co.ke"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createBorrower.isPending}>
                  {createBorrower.isPending ? "Creating…" : "Create borrower"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
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
