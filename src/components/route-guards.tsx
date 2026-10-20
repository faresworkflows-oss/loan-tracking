import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, isStaffRole } from "@/lib/auth";

function LoadingScreen() {
  return (
    <div className="bg-background text-muted-foreground flex min-h-screen items-center justify-center text-sm">
      Loading…
    </div>
  );
}

/** The super admin and employees may use the desk; borrowers go to the portal. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { session, role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isStaffRole(role)) return <Navigate to="/portal" replace />;
  return <>{children}</>;
}

/** Pages only the super admin may open (staff management). */
export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { session, role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (role !== "super_admin") return <Navigate to={isStaffRole(role) ? "/" : "/portal"} replace />;
  return <>{children}</>;
}

/** Any signed-in user may open the portal (staff see an empty state). */
export function RequireBorrower({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
