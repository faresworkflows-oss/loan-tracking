import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Brand } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Karamu Lending" },
      {
        name: "description",
        content: "Sign in to the Karamu borrower portal to view your balance and statement.",
      },
      { property: "og:title", content: "Sign in — Karamu Lending" },
      {
        property: "og:description",
        content: "Sign in to the Karamu borrower portal to view your balance and statement.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // SUPABASE PLACEHOLDER:
    // await supabase.auth.signInWithPassword({ email, password })
    // then route admins to "/" and borrowers to "/portal" based on their role.
    navigate({ to: "/portal" });
  }

  return (
    <div className="bg-background text-foreground flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-[380px]">
        <Brand subtitle="BORROWER PORTAL" />

        <h1 className="font-display mt-8 text-2xl leading-tight font-semibold text-balance">
          Sign in to your statement
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Use the phone number or email registered on your loan.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Phone or email</Label>
            <Input id="identifier" name="identifier" required placeholder="0712 445 901" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
