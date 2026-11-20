/** Small helpers for "tick some rows, then act on them" lists. Sets are never mutated. */

export function toggleId(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Ticks or unticks a whole group of rows (e.g. everything currently on screen). */
export function setMany(selected: ReadonlySet<string>, ids: readonly string[], on: boolean): Set<string> {
  const next = new Set(selected);
  for (const id of ids) {
    if (on) next.add(id);
    else next.delete(id);
  }
  return next;
}

export type SelectionState = "all" | "some" | "none";

/** Whether none, some or all of the given rows are ticked. */
export function selectionState(selected: ReadonlySet<string>, ids: readonly string[]): SelectionState {
  if (ids.length === 0) return "none";
  const ticked = ids.filter((id) => selected.has(id)).length;
  if (ticked === 0) return "none";
  return ticked === ids.length ? "all" : "some";
}

/** Splits a list into batches, so one request never carries hundreds of ids. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
