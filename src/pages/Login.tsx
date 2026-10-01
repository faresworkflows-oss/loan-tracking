import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Brand } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error || !data.session) {
      toast.error("Sign in failed", { description: error?.message ?? "Check your details." });
      return;
    }

    const { data: adminRow } = await supabase
      .from("admins")
      .select("id")
      .eq("id", data.session.user.id)
      .maybeSingle();

    navigate(adminRow ? "/" : "/portal", { replace: true });
  }

  return (
    <div className="bg-background text-foreground flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-[380px]">
        <Brand subtitle="SIGN IN" />

        <h1 className="font-display mt-8 text-2xl leading-tight font-semibold text-balance">
          Sign in to your account
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Use the email and password set up for your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.co.ke" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
