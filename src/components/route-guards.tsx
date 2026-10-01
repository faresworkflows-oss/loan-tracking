import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

function LoadingScreen() {
  return (
    <div className="bg-background text-muted-foreground flex min-h-screen items-center justify-center text-sm">
      Loading…
    </div>
  );
}

/** Only admins (present in the `admins` table) may see admin desk pages. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/portal" replace />;
  return <>{children}</>;
}

/** Any signed-in user (borrower or admin previewing) may see the portal. */
export function RequireBorrower({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
