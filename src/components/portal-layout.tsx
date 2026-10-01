import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { Brand } from "./admin-layout";

function tabClass(isActive: boolean) {
  const base = "text-muted-foreground rounded-full px-3 py-1.5 text-xs";
  return isActive ? `${base} bg-card text-foreground font-semibold` : base;
}

export function PortalLayout({
  borrowerName,
  children,
}: {
  borrowerName: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="mx-auto max-w-[480px] px-5 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Brand />
          <span className="text-muted-foreground font-mono text-[11px]">{borrowerName}</span>
        </div>

        <nav className="mb-6 flex gap-1">
          <NavLink to="/portal" end className={({ isActive }) => tabClass(isActive)}>
            Dashboard
          </NavLink>
          <NavLink to="/portal/statement" className={({ isActive }) => tabClass(isActive)}>
            Statement
          </NavLink>
        </nav>

        {children}

        <footer className="mt-10 border-t pt-5">
          <p className="text-muted-foreground text-[11px] tracking-[0.25em] uppercase">
            Karamu Lending · Nairobi
          </p>
        </footer>
      </div>
    </div>
  );
}
