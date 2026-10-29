<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules

- Plain Vite + React SPA using `react-router-dom` for routing (no TanStack Router/Start, no SSR). Routes are defined in `src/App.tsx` and page components live in `src/pages/`.
- All data access goes through `src/lib/data.ts`, which wraps real Supabase queries/mutations in React Query hooks. Don't query Supabase directly from a page — add or extend a hook in `data.ts` instead, so every page gets consistent shapes, loading states, and cache invalidation.
- `src/lib/supabaseClient.ts` reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from env vars (see `.env.example`). Never hardcode Supabase credentials in source.
- Access control: `admins` table (keyed by `auth.users.id`) marks admin users; everyone else is treated as a borrower. `RequireAdmin` / `RequireBorrower` in `src/components/route-guards.tsx` gate the two route groups. RLS policies on every table are the real enforcement layer — the guards are just UI routing.
- New loans earn 5% of the principal per week of the loan, flat, with weekly, every-2-weeks or monthly (every 4 weeks) repayments. The real calculation lives in the `create_loan` Postgres function; `src/lib/loan-math.ts` only previews it, so change the rate in BOTH places. Older loans (10% a year, monthly) keep their stored numbers.
- Loans are created through the `create-loan` edge function (never by inserting into `loans` / `repayment_schedule` from the browser), so nobody can alter the rate or schedule. Pages show stored values (`total_payable`, `installment_amount`, `term_weeks`…) and the label helpers in `src/lib/data.ts` rather than recalculating.
- Realtime balance updates come from `useRealtimeSync` in `src/lib/data.ts`, which subscribes to `postgres_changes` on `loans`, `repayment_schedule`, `payments`, and `notifications_log` and invalidates the matching React Query caches.
