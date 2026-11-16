import type { Borrower } from "./data";

/** Ignores spaces, dashes and dots, so "28 441 902" finds "28441902". */
export function normalizeId(value: string) {
  return value.replace(/[\s\-.]/g, "").toLowerCase();
}

/**
 * Finds borrowers by ID number. Typing part of an ID works too, and an exact
 * match is listed first. Borrowers saved without an ID number can't match.
 */
export function searchBorrowersById(borrowers: Borrower[], query: string): Borrower[] {
  const q = normalizeId(query);
  if (!q) return borrowers;
  const hits = borrowers.filter((b) => b.national_id && normalizeId(b.national_id).includes(q));
  const isExact = (b: Borrower) => (normalizeId(b.national_id ?? "") === q ? 1 : 0);
  return hits.sort((a, b) => isExact(b) - isExact(a));
}
