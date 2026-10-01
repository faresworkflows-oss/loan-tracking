import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Overview", end: true },
  { to: "/loans", label: "Loans", end: false },
  { to: "/borrowers", label: "Borrowers", end: false },
  { to: "/payments", label: "M-Pesa Matching", end: false },
  { to: "/notifications", label: "SMS Log", end: false },
] as const;

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-coral text-ink font-display grid size-9 place-items-center rounded-[10px] text-lg font-bold">
        K
      </div>
      <div>
        <p className="font-display text-base leading-none font-semibold">Karamu</p>
        {subtitle ? (
          <p className="text-muted-foreground mt-0.5 text-[11px] tracking-wide">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4 md:px-8">
      <div>
        <p className="text-coral text-[11px] font-semibold tracking-[0.2em] uppercase">{eyebrow}</p>
        <h1 className="font-display max-w-[40ch] text-2xl leading-tight font-semibold text-balance md:text-[28px]">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

export function Panel({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-card overflow-hidden rounded-xl ring-1 ring-white/10">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-balance">{title}</h2>
        {meta ? <span className="text-muted-foreground font-mono text-xs">{meta}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  right,
}: {
  children: ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`text-muted-foreground px-5 py-3 text-[11px] font-medium tracking-[0.12em] uppercase ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function navLinkClass(isActive: boolean, mobile = false) {
  const base = mobile
    ? "text-muted-foreground shrink-0 rounded-full px-3 py-1.5 text-xs"
    : "text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 transition-colors";
  return isActive ? `${base} bg-coral text-ink font-semibold` : base;
}

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground flex min-h-screen">
      <aside className="bg-sidebar hidden w-60 shrink-0 flex-col border-r p-5 md:flex">
        <div className="mb-10">
          <Brand subtitle="LENDING DESK" />
        </div>
        <nav className="space-y-1 text-sm">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <span className="grid size-4 shrink-0 place-items-center">
                <span className="size-2.5 rounded-[2px] bg-current opacity-60" />
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t pt-6">
          <NavLink to="/portal" className="text-muted-foreground hover:text-foreground text-xs">
            Switch to borrower portal →
          </NavLink>
          <div className="mt-4 flex items-center gap-2.5">
            <div className="bg-teal/20 text-teal grid size-8 place-items-center rounded-full font-mono text-xs font-bold">
              AO
            </div>
            <div>
              <p className="text-sm leading-none font-medium">A. Otieno</p>
              <p className="text-muted-foreground mt-1 text-[11px]">Collections Lead</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <nav className="flex gap-1 overflow-x-auto border-b px-4 py-3 md:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => navLinkClass(isActive, true)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
