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

- All data lives in `src/lib/mock-data.ts` as Supabase-shaped placeholders; swap each `get*` helper for a real query rather than fetching inline in routes.
- Loan interest is 10% flat annual, computed only in `src/lib/loan-math.ts`, so schedules and quotes never diverge.
