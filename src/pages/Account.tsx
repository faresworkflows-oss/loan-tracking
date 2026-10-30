import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin-layout";
import { PortalLayout } from "@/components/portal-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isStaffRole, useAuth } from "@/lib/auth";
import { useCurrentBorrower } from "@/lib/data";
import { supabase } from "@/lib/supabaseClient";

const MIN_LENGTH = 8;

function PasswordForm() {
  const { session } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== next;
  const same = next.length > 0 && next === current;
  const canSubmit =
    !!current && next.length >= MIN_LENGTH && confirm === next && next !== current && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const email = session?.user.email;
    if (!email || !canSubmit) return;
    setSaving(true);
    try {
      // Check the current password first, so a borrowed phone can't change it.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (verifyError) {
        toast.error("Your current password isn't right");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) {
        toast.error("Could not change the password", { description: updateError.message });
        return;
      }

      // Sign out every other device that was using the old password.
      await supabase.auth.signOut({ scope: "others" });

      toast.success("Password changed", {
        description: "Any other device that was signed in has been signed out.",
      });
      setCurrent("");
      setNext("");
      setConfirm("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <p className="text-muted-foreground text-sm">
        Signed in as <span className="text-foreground font-mono">{session?.user.email}</span>
      </p>

      <div className="space-y-2">
        <Label htmlFor="current_password">Current password</Label>
        <Input
          id="current_password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new_password">New password</Label>
        <Input
          id="new_password"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <p className={`text-xs ${tooShort || same ? "text-coral" : "text-muted-foreground"}`}>
          {same
            ? "Choose a password different from your current one."
            : `At least ${MIN_LENGTH} characters.`}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirm new password</Label>
        <Input
          id="confirm_password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {mismatch ? <p className="text-coral text-xs">The two passwords don't match.</p> : null}
      </div>

      <Button type="submit" disabled={!canSubmit}>
        {saving ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}

export default function AccountPage() {
  const { role, session } = useAuth();
  const { data: borrower } = useCurrentBorrower();

  if (isStaffRole(role)) {
    return (
      <AdminLayout>
        <PageHeader eyebrow="Security" title="Change password" />
        <div className="p-6 md:p-8">
          <PasswordForm />
        </div>
      </AdminLayout>
    );
  }

  return (
    <PortalLayout borrowerName={borrower?.full_name ?? session?.user.email ?? ""}>
      <h1 className="font-display mb-5 text-2xl leading-tight font-semibold">Change password</h1>
      <PasswordForm />
    </PortalLayout>
  );
}
