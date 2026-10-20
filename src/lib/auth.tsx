import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

export type Role = "super_admin" | "officer" | "borrower" | null;

export interface StaffProfile {
  full_name: string | null;
  email: string | null;
}

interface AuthState {
  session: Session | null;
  role: Role;
  staff: StaffProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  session: null,
  role: null,
  staff: null,
  loading: true,
});

export function isStaffRole(role: Role) {
  return role === "super_admin" || role === "officer";
}

/**
 * One shared auth state for the whole app: the Supabase session plus whether
 * the user is the super admin, an employee (officer) or a borrower. RLS is
 * what actually enforces access — this just drives routing and what the UI
 * shows.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    session: null,
    role: null,
    staff: null,
    loading: true,
  });
  const resolvedUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    async function resolve(session: Session | null) {
      if (!session) {
        resolvedUserId.current = null;
        if (active) setState({ session: null, role: null, staff: null, loading: false });
        return;
      }
      const { data: row } = await supabase
        .from("admins")
        .select("role, active, full_name, email")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!active) return;
      resolvedUserId.current = session.user.id;
      const isActiveStaff = !!row && row.active;
      setState({
        session,
        role: isActiveStaff ? (row.role as "super_admin" | "officer") : "borrower",
        staff: isActiveStaff ? { full_name: row.full_name, email: row.email } : null,
        loading: false,
      });
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      const newId = newSession?.user.id ?? null;

      // Never let one person's cached data show up for the next person.
      if (event === "SIGNED_OUT" || (resolvedUserId.current && newId !== resolvedUserId.current)) {
        queryClient.clear();
      }

      // Token refreshes and tab-focus checks for the same user shouldn't
      // flash the loading screen or re-run the role lookup.
      if (event !== "SIGNED_OUT" && newId && newId === resolvedUserId.current) {
        setState((s) => ({ ...s, session: newSession }));
        return;
      }

      setState((s) => ({ ...s, loading: true }));
      // Deferred so we never call Supabase from inside its own auth callback.
      setTimeout(() => {
        if (active) void resolve(newSession);
      }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [queryClient]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export async function signOut() {
  await supabase.auth.signOut();
}
