import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export type Role = "admin" | "borrower" | null;

interface AuthState {
  session: Session | null;
  role: Role;
  loading: boolean;
}

/**
 * Resolves the current Supabase Auth session and whether that user is an
 * admin (present in the `admins` table) or a plain borrower. RLS already
 * enforces access at the DB layer — this hook just drives UI routing.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ session: null, role: null, loading: true });

  useEffect(() => {
    let active = true;

    async function resolveRole(session: Session | null) {
      if (!session) {
        if (active) setState({ session: null, role: null, loading: false });
        return;
      }
      const { data: adminRow } = await supabase
        .from("admins")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!active) return;
      setState({ session, role: adminRow ? "admin" : "borrower", loading: false });
    }

    supabase.auth.getSession().then(({ data }) => resolveRole(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setState((s) => ({ ...s, loading: true }));
      resolveRole(newSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signOut() {
  await supabase.auth.signOut();
}
