import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ResetPasswordDialog, type ResetTarget } from "@/components/reset-password-dialog";
import { useAuth } from "@/lib/auth";
import { searchBorrowersById } from "@/lib/borrower-search";
import { formatKES } from "@/lib/format";
import { chunk, selectionState, setMany, toggleId } from "@/lib/selection";
import {
  useBorrowers,
  useCreateBorrower,
  useLoansForBorrower,
  useManageStaff,
  useStaff,
  loanOutstanding,
  staffLabel,
  staffNameById,
  type Borrower,
  type StaffMember,
} from "@/lib/data";

function AddBorrowerDialog() {
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const createBorrower = useCreateBorrower();
  const { role, session } = useAuth();
  const { data: staff } = useStaff();
  const activeStaff = (staff ?? []).filter((m) => m.active);

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
        ...(role === "super_admin" && ownerId ? { officer_id: ownerId } : {}),
      });
      setIssued({ email, password: result.temp_password });
    } catch (err) {
      toast.error("Could not save borrower", { description: (err as Error).message });
    }
  }

  function handleClose(next: boolean) {
    setOpen(next);
    if (!next) {
      setIssued(null);
      setOwnerId("");
    }
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
              {role === "super_admin" && activeStaff.length > 0 ? (
                <div className="space-y-2">
                  <Label>Assign to</Label>
                  <Select value={ownerId} onValueChange={setOwnerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Me (default)" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeStaff.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {staffLabel(m)}
                          {m.id === session?.user.id ? " (me)" : m.role === "super_admin" ? " (admin)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
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

function OwnerCell({ borrower, staff }: { borrower: Borrower; staff: StaffMember[] }) {
  const manageStaff = useManageStaff();
  const active = staff.filter((m) => m.active);

  async function change(newOwner: string) {
    if (newOwner === borrower.officer_id) return;
    try {
      await manageStaff.mutateAsync({
        action: "reassign",
        to_officer_id: newOwner,
        borrower_ids: [borrower.id],
      });
      toast.success(`${borrower.full_name} reassigned`);
    } catch (err) {
      toast.error("Could not reassign", { description: (err as Error).message });
    }
  }

  return (
    <Select value={borrower.officer_id ?? ""} onValueChange={change} disabled={manageStaff.isPending}>
      <SelectTrigger className="h-8 w-[170px] text-xs">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        {active.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {staffLabel(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BorrowerRow({
  borrower,
  staff,
  showOwner,
  onReset,
  selected,
  onToggle,
}: {
  borrower: Borrower;
  staff: StaffMember[];
  showOwner: boolean;
  onReset: () => void;
  selected: boolean;
  onToggle: () => void;
}) {
  const { id, full_name, phone, national_id } = borrower;
  const { data: theirLoans } = useLoansForBorrower(id);
  const loans = theirLoans ?? [];
  const active = loans.filter((l) => l.status === "active").length;
  const owed = loans.reduce((s, l) => s + loanOutstanding(l), 0);

  return (
    <tr className="ledger-row">
      {showOwner ? (
        <td className="w-10 px-5 py-3">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggle()}
            aria-label={`Select ${full_name}`}
          />
        </td>
      ) : null}
      <td className="px-5 py-3">
        <Link to={`/borrowers/${id}`} className="hover:text-coral font-medium">
          {full_name}
        </Link>
      </td>
      <td className="text-muted-foreground px-5 py-3 font-mono">{phone}</td>
      <td className="text-muted-foreground px-5 py-3 font-mono">{national_id ?? "—"}</td>
      {showOwner ? (
        <td className="px-5 py-3">
          <OwnerCell borrower={borrower} staff={staff} />
        </td>
      ) : null}
      <td className="px-5 py-3 text-right font-mono tabular-nums">{active}</td>
      <td className="px-5 py-3 text-right font-mono tabular-nums">{formatKES(owed)}</td>
      {showOwner ? (
        <td className="px-5 py-3 text-right">
          <Button size="sm" variant="secondary" onClick={onReset}>
            Reset password
          </Button>
        </td>
      ) : null}
    </tr>
  );
}

function AssignDialog({
  open,
  onClose,
  picked,
  target,
  staff,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  picked: Borrower[];
  target: StaffMember | undefined;
  staff: StaffMember[];
  onDone: () => void;
}) {
  const manageStaff = useManageStaff();
  const [working, setWorking] = useState(false);

  // Anyone already owned by the target is skipped, so nothing pointless is sent.
  const toMove = picked.filter((b) => b.officer_id !== target?.id);
  const alreadyThere = picked.length - toMove.length;
  const name = target ? staffLabel(target) : "";

  async function confirm() {
    if (!target || toMove.length === 0) return;
    setWorking(true);
    let moved = 0;
    try {
      // Small batches, so a long list never makes one oversized request.
      for (const batch of chunk(
        toMove.map((b) => b.id),
        50,
      )) {
        const result = await manageStaff.mutateAsync({
          action: "reassign",
          to_officer_id: target.id,
          borrower_ids: batch,
        });
        moved += result.moved ?? 0;
      }
      toast.success(`Assigned ${moved} borrower${moved === 1 ? "" : "s"} to ${name}`);
      onDone();
    } catch (err) {
      toast.error(moved > 0 ? `Assigned ${moved}, then it stopped` : "Could not assign", {
        description: (err as Error).message,
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !working && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            {toMove.length > 0
              ? `Assign ${toMove.length} borrower${toMove.length === 1 ? "" : "s"} to ${name}?`
              : "Nothing to assign"}
          </DialogTitle>
          <DialogDescription>
            {toMove.length > 0
              ? `They'll show up in ${name}'s list straight away and leave their current owners' lists.`
              : `Everyone selected already belongs to ${name}.`}
            {toMove.length > 0 && alreadyThere > 0
              ? ` ${alreadyThere} already ${alreadyThere === 1 ? "belongs" : "belong"} to ${name} and will be skipped.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        {toMove.length > 0 ? (
          <ul className="bg-muted/40 max-h-52 space-y-1 overflow-y-auto rounded-lg p-3 text-sm ring-1 ring-white/10">
            {toMove.slice(0, 8).map((b) => (
              <li key={b.id} className="flex justify-between gap-4">
                <span>{b.full_name}</span>
                <span className="text-muted-foreground text-xs">
                  now with {staffNameById(staff, b.officer_id)}
                </span>
              </li>
            ))}
            {toMove.length > 8 ? (
              <li className="text-muted-foreground text-xs">and {toMove.length - 8} more</li>
            ) : null}
          </ul>
        ) : null}
        <DialogFooter>
          <Button onClick={confirm} disabled={working || toMove.length === 0}>
            {working ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BorrowersIndexPage() {
  const { data: borrowers, isLoading } = useBorrowers();
  const { role, session } = useAuth();
  const { data: staff } = useStaff();
  const showOwner = role === "super_admin";
  const [resetting, setResetting] = useState<ResetTarget | null>(null);
  const [typed, setTyped] = useState("");
  const [searched, setSearched] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignTo, setAssignTo] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);

  const activeStaff = (staff ?? []).filter((m) => m.active);
  const optionLabel = (m: StaffMember) =>
    staffLabel(m) + (m.id === session?.user.id ? " (me)" : m.role === "super_admin" ? " (admin)" : "");

  const shown = useMemo(() => {
    let list = searched ? searchBorrowersById(borrowers ?? [], searched) : (borrowers ?? []);
    if (showOwner && ownerFilter !== "all") {
      list = list.filter((b) => (ownerFilter === "none" ? !b.officer_id : b.officer_id === ownerFilter));
    }
    return list;
  }, [borrowers, searched, showOwner, ownerFilter]);

  const shownIds = useMemo(() => shown.map((b) => b.id), [shown]);
  const headState = selectionState(selected, shownIds);
  const picked = useMemo(
    () => (borrowers ?? []).filter((b) => selected.has(b.id)),
    [borrowers, selected],
  );
  const hiddenPicked = picked.filter((b) => !shownIds.includes(b.id)).length;
  const target = activeStaff.find((m) => m.id === assignTo);
  const filtering = !!searched || ownerFilter !== "all";
  const columnCount = showOwner ? 8 : 5;

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearched(typed.trim());
  }

  function clearSearch() {
    setTyped("");
    setSearched("");
  }

  return (
    <AdminLayout>
      <PageHeader eyebrow="Book" title="Borrowers" action={<AddBorrowerDialog />} />
      <div className="space-y-4 p-6 md:p-8">
        <form onSubmit={runSearch} className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Search by ID number"
              inputMode="numeric"
              aria-label="Search borrowers by ID number"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={!typed.trim()}>
            Search
          </Button>
          {searched || typed ? (
            <Button type="button" variant="secondary" onClick={clearSearch}>
              Clear
            </Button>
          ) : null}
          {showOwner ? (
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-[210px]" aria-label="Show borrowers of one employee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {(staff ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {optionLabel(m)}
                  </SelectItem>
                ))}
                <SelectItem value="none">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </form>

        {showOwner && picked.length > 0 ? (
          <div className="bg-card flex flex-wrap items-center gap-3 rounded-xl p-4 ring-1 ring-white/10">
            <p className="text-sm font-medium">
              {picked.length} selected
              {hiddenPicked > 0 ? (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  ({hiddenPicked} hidden by the search or filter)
                </span>
              ) : null}
            </p>
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Assign to…" />
              </SelectTrigger>
              <SelectContent>
                {activeStaff.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {optionLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!target} onClick={() => setAssignOpen(true)}>
              Assign
            </Button>
            <Button variant="secondary" onClick={() => setSelected(new Set())}>
              Clear selection
            </Button>
          </div>
        ) : null}

        <Panel
          title={
            searched
              ? `Results for "${searched}"`
              : ownerFilter === "none"
                ? "Unassigned borrowers"
                : ownerFilter !== "all"
                  ? `${staffNameById(staff, ownerFilter)}'s borrowers`
                  : "All borrowers"
          }
          meta={filtering ? `${shown.length} found` : `${borrowers?.length ?? 0} records`}
        >
          <TableWrap>
            <thead>
              <tr className="border-b">
                {showOwner ? (
                  <th className="w-10 px-5 py-3">
                    <Checkbox
                      checked={
                        headState === "all" ? true : headState === "some" ? "indeterminate" : false
                      }
                      onCheckedChange={() =>
                        setSelected((s) => setMany(s, shownIds, headState !== "all"))
                      }
                      aria-label="Select everyone shown"
                    />
                  </th>
                ) : null}
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>National ID</Th>
                {showOwner ? <Th>Assigned to</Th> : null}
                <Th right>Active loans</Th>
                <Th right>Total owed</Th>
                {showOwner ? <Th right>Actions</Th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={columnCount} className="text-muted-foreground px-5 py-8 text-center">
                    Loading…
                  </td>
                </tr>
              ) : shown.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="text-muted-foreground px-5 py-8 text-center">
                    {searched
                      ? `No ${showOwner ? "borrower" : "client of yours"} has an ID number matching "${searched}".`
                      : ownerFilter !== "all"
                        ? "No borrowers match this filter."
                        : "No borrowers yet."}
                  </td>
                </tr>
              ) : (
                shown.map((b) => (
                  <BorrowerRow
                    key={b.id}
                    borrower={b}
                    staff={staff ?? []}
                    showOwner={showOwner}
                    onReset={() => setResetting({ kind: "borrower", id: b.id, name: b.full_name })}
                    selected={selected.has(b.id)}
                    onToggle={() => setSelected((s) => toggleId(s, b.id))}
                  />
                ))
              )}
            </tbody>
          </TableWrap>
        </Panel>
      </div>
      <ResetPasswordDialog target={resetting} onClose={() => setResetting(null)} />
      <AssignDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        picked={picked}
        target={target}
        staff={staff ?? []}
        onDone={() => {
          setAssignOpen(false);
          setSelected(new Set());
          setAssignTo("");
        }}
      />
    </AdminLayout>
  );
}
