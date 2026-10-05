export function formatKES(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}
