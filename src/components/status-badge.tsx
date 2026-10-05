import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        good: "bg-teal/15 text-teal",
        warn: "bg-gold/15 text-gold",
        bad: "bg-coral/15 text-coral",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

const dot = cva("size-1.5 rounded-full", {
  variants: {
    tone: {
      neutral: "bg-muted-foreground",
      good: "bg-teal",
      warn: "bg-gold",
      bad: "bg-coral",
    },
  },
  defaultVariants: { tone: "neutral" },
});

type Tone = NonNullable<VariantProps<typeof statusBadge>["tone"]>;

const TONES: Record<string, Tone> = {
  pending: "neutral",
  paid: "good",
  late: "warn",
  penalized: "bad",
  matched: "good",
  unmatched: "warn",
  active: "good",
  completed: "neutral",
  defaulted: "bad",
  closed: "neutral",
  sent: "neutral",
  delivered: "good",
  failed: "bad",
  reminder: "neutral",
  overdue: "warn",
  payment_received: "good",
  account_created: "good",
};

const LABELS: Record<string, string> = {
  payment_received: "Payment received",
  account_created: "Account created",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = TONES[status] ?? "neutral";
  const label = LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={cn(statusBadge({ tone }), className)}>
      <span className={dot({ tone })} />
      {label}
    </span>
  );
}
