import { StatusBadge } from "@/components/status-badge";
import { classify, timingText } from "@/lib/dues";
import { formatKES } from "@/lib/format";
import type { Installment } from "@/lib/data";

/** Paid / pending as stored, but anything late or due today is shown as such. */
export function InstallmentStatus({
  installment,
  today,
}: {
  installment: Installment;
  today: string;
}) {
  const unpaid = installment.amount_due - installment.amount_paid > 0;
  if (!unpaid) return <StatusBadge status={installment.status} />;

  const { daysLate, bucket } = classify(installment.due_date, today);
  if (bucket === "past_due" || bucket === "in_grace" || bucket === "due_today") {
    return (
      <div className="flex flex-col items-end gap-1">
        <StatusBadge status={bucket} />
        {daysLate > 0 ? (
          <span className="text-muted-foreground text-[11px]">{timingText(daysLate)}</span>
        ) : null}
        {installment.penalty > 0 ? (
          <span className="text-coral text-[11px]">+{formatKES(installment.penalty)} penalty</span>
        ) : null}
      </div>
    );
  }
  return <StatusBadge status={installment.status} />;
}
