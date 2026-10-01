/** Currency + date formatting helpers. All money in the app is KES. */

export function formatKES(amount: number, opts?: { compact?: boolean }): string {
  if (opts?.compact && Math.abs(amount) >= 1_000_000) {
    return `KES ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
