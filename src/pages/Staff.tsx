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
import { useAuth } from "@/lib/auth";
import { formatKES } from "@/lib/format";
import { staffLabel, useManageStaff, usePerformance, type OfficerPerformance } from "@/lib/data";

function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const manageStaff = useManageStaff();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    try {
      const result = await manageStaff.mutateAsync({
        action: "create",
        full_name: String(form.get("full_name")),
        phone: String(form.get("phone")),
        email,
      });
      setIssued({ email, password: result.temp_password ?? "" });
    } catch (err) {
      toast.error("Could not add employee", { description: (err as Error).message });
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setIssued(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Add employee</Button>
      </DialogTrigger>
      <DialogContent>
        {issued ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Employee added</DialogTitle>
              <DialogDescription>
                A text with these login details has been sent to their phone. The password is shown
                only once here and can't be retrieved later.
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
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Add employee</DialogTitle>
              <DialogDescription>
                They'll sign in at the same login page and see only the clients assigned to them.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staff_full_name">Full name</Label>
                <Input id="staff_full_name" name="full_name" required placeholder="Jane Wanjiru" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff_phone">Phone</Label>
                <Input id="staff_phone" name="phone" required placeholder="+254712345678" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff_email">Email (used to log in)</Label>
                <Input
                  id="staff_email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.co.ke"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={manageStaff.isPending}>
                  {manageStaff.isPending ? "Adding…" : "Add employee"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OwnerPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (id: string) => void;
  options: OfficerPerformance[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Choose who takes over" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {staffLabel(o)}
            {o.role === "super_admin" ? " (you)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DeactivateDialog({
  member,
  others,
  onClose,
}: {
  member: OfficerPerformance | null;
  others: OfficerPerformance[];
  onClose: () => void;
}) {
  const [target, setTarget] = useState("");
  const manageStaff = useManageStaff();
  const needsOwner = (member?.clients ?? 0) > 0;

  async function confirm() {
    if (!member) return;
    try {
      await manageStaff.mutateAsync({
        action: "deactivate",
        staff_id: member.id,
        ...(needsOwner ? { reassign_to: target } : {}),
      });
      toast.success(`${staffLabel(member)} deactivated`);
      setTarget("");
      onClose();
    } catch (err) {
      toast.error("Could not deactivate", { description: (err as Error).message });
    }
  }

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Deactivate {staffLabel(member)}?</DialogTitle>
          <DialogDescription>
            They will no longer be able to sign in. You can reactivate them later.
            {needsOwner
              ? ` They currently own ${member?.clients} client(s), who must be handed to someone else.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        {needsOwner ? (
          <div className="space-y-2">
            <Label>New owner for their clients</Label>
            <OwnerPicker value={target} onChange={setTarget} options={others} />
          </div>
        ) : null}
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={manageStaff.isPending || (needsOwner && !target)}
          >
            {manageStaff.isPending ? "Working…" : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReassignDialog({
  member,
  others,
  onClose,
}: {
  member: OfficerPerformance | null;
  others: OfficerPerformance[];
  onClose: () => void;
}) {
  const [target, setTarget] = useState("");
  const manageStaff = useManageStaff();

  async function confirm() {
    if (!member || !target) return;
    try {
      const result = await manageStaff.mutateAsync({
        action: "reassign",
        from_officer_id: member.id,
        to_officer_id: target,
      });
      toast.success(`Moved ${result.moved ?? 0} client(s)`);
      setTarget("");
      onClose();
    } catch (err) {
      toast.error("Could not move clients", { description: (err as Error).message });
    }
  }

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            Move {staffLabel(member)}'s clients
          </DialogTitle>
          <DialogDescription>
            All {member?.clients} of their clients move to the person you choose. Loans keep a
            record of who originally created them.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Move to</Label>
          <OwnerPicker value={target} onChange={setTarget} options={others} />
        </div>
        <DialogFooter>
          <Button onClick={confirm} disabled={manageStaff.isPending || !target}>
            {manageStaff.isPending ? "Moving…" : "Move clients"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StaffPage() {
  const { session } = useAuth();
  const { isLoading, rows } = usePerformance();
  const manageStaff = useManageStaff();
  const [deactivating, setDeactivating] = useState<OfficerPerformance | null>(null);
  const [reassigning, setReassigning] = useState<OfficerPerformance | null>(null);

  const activeStaff = rows.filter((r) => r.active);
  const othersFor = (member: OfficerPerformance | null) =>
    activeStaff.filter((r) => r.id !== member?.id);

  async function reactivate(member: OfficerPerformance) {
    try {
      await manageStaff.mutateAsync({ action: "reactivate", staff_id: member.id });
      toast.success(`${staffLabel(member)} reactivated`);
    } catch (err) {
      toast.error("Could not reactivate", { description: (err as Error).message });
    }
  }

  return (
    <AdminLayout>
      <PageHeader eyebrow="Team" title="Staff" action={<AddEmployeeDialog />} />
      <div className="p-6 md:p-8">
        <Panel title="Employees" meta={`${activeStaff.length} active`}>
          <TableWrap>
            <thead>
              <tr className="border-b">
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th right>Clients</Th>
                <Th right>Active loans</Th>
                <Th right>Outstanding</Th>
                <Th right>Collected (month)</Th>
                <Th right>Overdue</Th>
                <Th right>Status</Th>
                <Th right>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-muted-foreground px-5 py-8 text-center">
                    Loading…
                  </td>
                </tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.id} className="ledger-row">
                    <td className="px-5 py-3">
                      <p className="font-medium">
                        {staffLabel(m)}
                        {m.id === session?.user.id ? (
                          <span className="text-muted-foreground ml-2 text-xs">(you)</span>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {m.role === "super_admin" ? "Super admin" : "Employee"}
                        {m.email ? ` · ${m.email}` : ""}
                      </p>
                    </td>
                    <td className="text-muted-foreground px-5 py-3 font-mono">{m.phone ?? "—"}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{m.clients}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{m.activeLoans}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {formatKES(m.outstanding)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {formatKES(m.collectedThisMonth)}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-mono tabular-nums ${
                        m.overdueLoans > 0 ? "text-coral" : ""
                      }`}
                    >
                      {m.overdueLoans}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <StatusBadge status={m.active ? "active" : "inactive"} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {m.active && m.clients > 0 && othersFor(m).length > 0 ? (
                          <Button size="sm" variant="secondary" onClick={() => setReassigning(m)}>
                            Move clients
                          </Button>
                        ) : null}
                        {m.active && m.role !== "super_admin" ? (
                          <Button size="sm" variant="secondary" onClick={() => setDeactivating(m)}>
                            Deactivate
                          </Button>
                        ) : null}
                        {!m.active ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={manageStaff.isPending}
                            onClick={() => reactivate(m)}
                          >
                            Reactivate
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </TableWrap>
        </Panel>
      </div>

      <DeactivateDialog
        member={deactivating}
        others={othersFor(deactivating)}
        onClose={() => setDeactivating(null)}
      />
      <ReassignDialog
        member={reassigning}
        others={othersFor(reassigning)}
        onClose={() => setReassigning(null)}
      />
    </AdminLayout>
  );
}
