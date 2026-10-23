import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth";
import { formatKES } from "@/lib/format";
import { isIncompleteStk, isManualChannel, type Payment } from "@/lib/data";

/** Status badge plus any flags (voided, not completed, overpaid) for one payment. */
export function PaymentStatusBadge({ p }: { p: Payment }) {
  if (p.voided_at) {
    return (
      <div className="flex flex-col items-end gap-1">
        <StatusBadge status="voided" />
        {p.void_reason ? (
          <span className="text-muted-foreground max-w-[200px] text-right text-[11px]">
            {p.void_reason}
          </span>
        ) : null}
      </div>
    );
  }
  if (isIncompleteStk(p)) {
    return <span className="text-muted-foreground text-xs">Not completed</span>;
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <StatusBadge status={p.match_status} />
      {p.overpayment > 0 ? (
        <span className="text-coral text-[11px] font-medium">
          Overpaid {formatKES(p.overpayment)}
        </span>
      ) : null}
    </div>
  );
}

/** Who entered a payment by hand. Blank for payments that arrived automatically. */
export function RecordedBy({ p }: { p: Payment }) {
  const { session } = useAuth();
  if (!isManualChannel(p.channel)) {
    return <span className="text-muted-foreground text-xs">Automatic</span>;
  }
  const who =
    p.recorded_by && p.recorded_by === session?.user.id
      ? "You"
      : (p.recorded_by_name ?? (p.recorded_by ? "Admin" : "—"));
  return <span className="text-xs">{who}</span>;
}
