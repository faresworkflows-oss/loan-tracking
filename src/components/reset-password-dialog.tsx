import { useState } from "react";
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
import { useResetPassword } from "@/lib/data";

export interface ResetTarget {
  kind: "borrower" | "staff";
  id: string;
  name: string;
}

/** Confirm, then show the new temporary password once (it's also texted to them). */
export function ResetPasswordDialog({
  target,
  onClose,
}: {
  target: ResetTarget | null;
  onClose: () => void;
}) {
  const [result, setResult] = useState<{ password: string; smsSent: boolean } | null>(null);
  const reset = useResetPassword();

  function close() {
    setResult(null);
    onClose();
  }

  async function confirm() {
    if (!target) return;
    try {
      const r = await reset.mutateAsync({ kind: target.kind, id: target.id });
      setResult({ password: r.temp_password, smsSent: r.sms_sent });
    } catch (err) {
      toast.error("Could not reset the password", { description: (err as Error).message });
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Password reset</DialogTitle>
              <DialogDescription>
                {result.smsSent
                  ? `A text with the new password has been sent to ${target?.name}.`
                  : `The text couldn't be sent, so give ${target?.name} this password yourself.`}{" "}
                It's shown only once here and can't be looked up later.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted/40 flex justify-between gap-4 rounded-lg p-4 text-sm ring-1 ring-white/10">
              <span className="text-muted-foreground">Temporary password</span>
              <span className="font-mono font-bold">{result.password}</span>
            </div>
            <DialogFooter>
              <Button onClick={close}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Reset {target?.name}'s password?</DialogTitle>
              <DialogDescription>
                A new temporary password is created and texted to them. Their current password stops
                working straight away.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="destructive" onClick={confirm} disabled={reset.isPending}>
                {reset.isPending ? "Resetting…" : "Reset password"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
