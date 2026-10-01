import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Brand } from "./admin-layout";

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
          <Link
            to="/portal"
            activeOptions={{ exact: true }}
            className="text-muted-foreground rounded-full px-3 py-1.5 text-xs data-[status=active]:bg-card data-[status=active]:text-foreground data-[status=active]:font-semibold"
          >
            Dashboard
          </Link>
          <Link
            to="/portal/statement"
            className="text-muted-foreground rounded-full px-3 py-1.5 text-xs data-[status=active]:bg-card data-[status=active]:text-foreground data-[status=active]:font-semibold"
          >
            Statement
          </Link>
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
