# Pitfalls Research

**Domain:** React monolithic component refactoring — localStorage-to-Supabase migration, 50+ useState decomposition, feature-parity preservation
**Researched:** 2026-04-06
**Confidence:** HIGH (project-specific analysis of actual code + verified patterns)

---

## Critical Pitfalls

### Pitfall 1: Big-Bang Refactor Breaks Feature Parity Silently

**What goes wrong:**
All 4,243 lines are extracted into new components/hooks in one go. The app compiles and loads, but subtle behavioral differences are invisible until a user reports data loss or a workflow breaks. There is no regression baseline to diff against because there were no tests before the refactor began.

**Why it happens:**
"One milestone" framing encourages treating the whole refactor as a single atomic operation. Developers move fast, extract hooks and components together, and test only happy paths. Edge cases — particularly in the 14+ distinct localStorage keys, the Google Calendar token refresh chain, and the biometric unlock flow — get missed.

**How to avoid:**
- Refactor feature-by-feature, not file-by-file. Extract one domain (e.g., schedules) into its hook and component while leaving everything else untouched. Ship to production. Then move to the next domain.
- Define a manual smoke-test checklist before any code changes: login with email, login with Google, create a schedule, edit a template, trigger a gcal sync, enable biometrics. Run this checklist after each extraction, not at the end.
- Use the Strangler Fig pattern: new code replaces old code path-by-path, never all at once.

**Warning signs:**
- A PR touches more than two feature domains at once
- No intermediate commits between hook extraction and component extraction
- "I'll test everything at the end" reasoning

**Phase to address:**
Phase 1 (Foundation). Establish the refactoring protocol and checklist before writing a single line of extracted code.

---

### Pitfall 2: localStorage Keys Scattered Across Extraction Without Inventory

**What goes wrong:**
The codebase has 14 distinct localStorage keys (`blogSchedules`, `blogger_profile`, `blogger_templates`, `blogger_ftc_templates`, `blogger_hashtags`, `blogger_saved_texts`, `blogger_font_size`, `theme_color`, `gcal_token`, `gcal_token_expiry`, `gcal_refresh_token`, `gcal_selected_cal`, `biometric_enabled`, `biometric_cred_id`, `location_perm`). During extraction, some keys get renamed, some get moved to Supabase, some stay in localStorage. A read from one extracted hook expects `blogger_templates` but a save path in another hook now writes to Supabase. The two paths diverge; the user saves a template, refreshes, and the template is gone.

**Why it happens:**
There is no single source of truth for storage key names. The keys are string literals repeated across 65+ localStorage calls in BloggerMasterApp.jsx. When extracted piecemeal without a central constants file, different developers (or different sessions) use slightly different keys.

**How to avoid:**
- Before any extraction, create `src/constants/storageKeys.ts` with every key as a named export: `export const STORAGE_KEYS = { SCHEDULES: 'blogSchedules', PROFILE: 'blogger_profile', ... }`.
- All localStorage reads/writes reference constants, never string literals.
- When migrating a key to Supabase, mark it `DEPRECATED` in the constants file and add a migration function that reads the old key and writes to Supabase on first load.

**Warning signs:**
- String literal `'blogSchedules'` appears in any file other than the constants file
- A hook reads from localStorage and another hook saves to Supabase for the same data type without a migration bridge

**Phase to address:**
Phase 1 (Foundation). Create the constants file before any hook extraction starts.

---

### Pitfall 3: localStorage-to-Supabase Migration Creates a Dual-Write Gap

**What goes wrong:**
During migration, some code paths still write to localStorage while new code paths read from Supabase. The user creates a schedule on their desktop (writes to Supabase), then opens the app on mobile (which still reads from localStorage, finds nothing, and shows an empty list). Or worse: the old localStorage write runs, the new Supabase write fails silently, and the user's data exists only in localStorage on one device.

**Why it happens:**
Migration is done incrementally (which is correct) but without a clear "write to both, read from new" transition period. The old code is deleted the moment the new code is written.

**How to avoid:**
- Use a three-phase migration per data type:
  1. **Read from Supabase, fall back to localStorage** — if Supabase returns null, read localStorage and immediately write that data to Supabase (one-time migration trigger).
  2. **Write to Supabase only** — once the fallback has run.
  3. **Delete localStorage key** — after confirming Supabase data is present.
- Implement a `migrateUserData()` function that runs once per user on login, checks which localStorage keys still have data, uploads them to Supabase, and sets a migration flag in Supabase user metadata.

**Warning signs:**
- A useEffect reads from Supabase but there is no fallback for users with existing localStorage data
- No migration function exists when the first Supabase table is created
- Assuming all users are new; existing users have months of data in localStorage

**Phase to address:**
Phase 3 (Supabase DB Migration). The migration bridge must be the first thing built, not the last.

---

### Pitfall 4: Extracting Hooks That Share State Without a Clear Owner

**What goes wrong:**
`BloggerMasterApp.jsx` has 87 useState calls. When extracting `useSchedules`, `useTemplates`, `useProfile`, and `useCalendar` hooks, some state is used by multiple features. For example, the blogger profile contains `gcalSelectedCal` which is used by both `useProfile` and `useCalendar`. After extraction, each hook manages its own copy. They go out of sync. Changing the calendar in Profile settings does not update what the Calendar hook sees.

**Why it happens:**
In a monolith, sharing state is trivial — everything is in one component. When splitting into hooks, there is no single shared store, so developers either duplicate state or pass data back up through the component, re-creating prop drilling.

**How to avoid:**
- Before extracting any hook, map all state dependencies: which state does each feature read? which does it write? Build a dependency graph.
- State that is read by more than one feature must live at the highest common layer (the root component) or in a shared Context/Zustand store.
- Profile data that is also needed by Calendar must be owned by a single `useProfile` hook and passed down — not duplicated in `useCalendar`.
- Do not reach for Context first. Lift the shared state to the parent component. Only introduce Context if prop depth exceeds two levels.

**Warning signs:**
- Two hooks both declare `useState` for `selectedCalendar` or `gcalToken`
- A hook calls `localStorage.getItem('blogger_profile')` instead of receiving profile data as a prop or from a shared hook
- Profile save and Calendar token save happen in different hooks with no coordination

**Phase to address:**
Phase 2 (Hook Extraction). Complete the state dependency map before writing a single extracted hook.

---

### Pitfall 5: Supabase RLS Omitted During Table Creation

**What goes wrong:**
Supabase tables for schedules, templates, and profiles are created without Row Level Security policies. The tables are accessible to any authenticated user — or with the anon key, to anyone. This is a data breach waiting to happen: a user can query another user's schedules by manipulating the API call.

**Why it happens:**
RLS feels like extra work during a refactoring sprint focused on structure. Developers say "I'll add security later." Later never comes, or the app launches without it.

**How to avoid:**
- Enable RLS on every table at creation time, not after.
- Default policy: `auth.uid() = user_id` on all rows. No exceptions.
- Never use the `service_role` key in client-side code.
- Add indexes on `user_id` columns used in RLS policies — without this, Supabase does a full table scan per query, causing severe performance degradation at scale.
- Use `supabase gen types typescript` to generate typed client code; type mismatches reveal policy gaps early.

**Warning signs:**
- A newly created Supabase table has no RLS policies in the Supabase dashboard
- Client code uses `SUPABASE_SERVICE_ROLE_KEY` in any `VITE_` prefixed env variable (exposed to browser)
- A `select()` query returns rows belonging to other users during testing

**Phase to address:**
Phase 3 (Supabase DB Migration). RLS policy must be the second line written after `CREATE TABLE`.

---

### Pitfall 6: Google Calendar Token Flow Broken After Refactoring

**What goes wrong:**
The Google Calendar OAuth flow spans multiple files and storage locations: URL hash → `localStorage.setItem('gcal_token')` → in-memory state → API calls → `api/gcal-refresh.js`. This flow is currently encoded in `BloggerMasterApp.jsx` across 80+ lines of scattered code. When refactoring extracts a `useGoogleCalendar` hook, the URL hash listener and the token refresh logic must move together. If the hash listener moves but the refresh logic stays in the parent, token expiry silently fails — the user's calendar sync stops working without any visible error.

**Why it happens:**
The URL hash listener (`window.location.hash` containing token) runs on mount. If that effect is split from the token-in-memory state, there is a timing gap where the token is in localStorage but not in the hook's state, causing a flash of "not connected" state.

**How to avoid:**
- Treat the entire gcal token lifecycle as one atomic extraction: hash listener + token state + refresh logic + disconnect function must all move to `useGoogleCalendar` together.
- The hook must initialize state from localStorage on mount, then clean the URL hash.
- After migration, move tokens to httpOnly cookies via a Vercel API route — the current localStorage storage is a security concern noted in CONCERNS.md.
- Write an explicit integration test (even manual) for the full OAuth flow after extraction: click connect → authorize → token stored → calendar events load → token refresh on expiry.

**Warning signs:**
- `gcal_token` is read from localStorage in any file other than `useGoogleCalendar.js`
- The URL hash cleanup (`window.history.replaceState`) is not in the same effect as the token write
- Calendar shows "connected" in UI but API calls return 401

**Phase to address:**
Phase 2 (Hook Extraction). The gcal hook is the highest-risk extraction; it should be the last hook extracted, after simpler hooks (useProfile, useTemplates) are proven stable.

---

### Pitfall 7: useEffect Dependency Arrays Broken After Hook Extraction

**What goes wrong:**
The existing `BloggerMasterApp.jsx` has 18 useEffect hooks. Many reference state variables that will move to other hooks after extraction. After moving state to a custom hook, the useEffect in the parent still runs — but the state it depends on is now stale closure captured from before extraction. The effect fires too often, or never fires, or fires with a two-render-old value.

**Why it happens:**
Dependency arrays in the original code are already fragile — the codebase uses zero `useCallback` and zero `useMemo`. When state moves from a parent component to a child hook, the function references returned by the hook are recreated every render, causing effects that depend on those functions to run on every render (infinite loop risk).

**How to avoid:**
- Add `useCallback` to all functions returned from custom hooks before those hooks are consumed by useEffect.
- After each hook extraction, run the app with React DevTools Profiler and confirm render count is not unbounded.
- The eslint rule `react-hooks/exhaustive-deps` must be enabled (it is in the current ESLint config). Treat every warning as a blocker, not a suggestion.
- Test pattern: after extracting any hook, add a console.log inside the hook's returned functions, trigger the relevant UI action once, and verify the log appears exactly once — not multiple times.

**Warning signs:**
- React DevTools shows a component rendering more than twice per user action
- A `useEffect` has an empty dependency array `[]` but uses state from a custom hook internally
- ESLint warnings about `exhaustive-deps` are suppressed with `// eslint-disable-next-line`

**Phase to address:**
Phase 2 (Hook Extraction). Apply `useCallback` to hook return values as a standard pattern, not an afterthought.

---

### Pitfall 8: Optimistic Updates Create Visible Data Flicker During Supabase Writes

**What goes wrong:**
When schedules or templates are saved to Supabase, there is a network round-trip. If the component re-renders before the write completes (e.g., the user navigates away and back), the data shown may be the pre-save state fetched from Supabase, not the just-saved state. The user sees their change briefly disappear, then reappear. This is especially visible with the schedule drag-and-drop reordering.

**Why it happens:**
localStorage writes are synchronous — state and storage are always in sync. Supabase writes are async. Without optimistic update handling, the UI reverts to whatever Supabase last confirmed.

**How to avoid:**
- Apply the optimistic update pattern: update local state immediately, then write to Supabase. On error, roll back local state and show an error toast.
- For drag-and-drop ordering, update the local array order immediately on drag-end, then write the new order to Supabase. Do not wait for Supabase before updating the UI.
- Use a `isSaving` flag to prevent the user from triggering another write while one is in flight. Show a subtle saving indicator.
- Consider TanStack Query (React Query) for its built-in optimistic update API if the number of mutations grows beyond 5-6 distinct write paths.

**Warning signs:**
- Any `await supabase.from().upsert()` is called before the local state update
- The UI shows a loading spinner that blocks the entire page while saving
- Drag-and-drop snaps back to original order for a moment after release

**Phase to address:**
Phase 3 (Supabase DB Migration). The optimistic update pattern must be established in the first Supabase write, then applied consistently.

---

### Pitfall 9: Supabase Realtime Subscriptions Leak in React StrictMode

**What goes wrong:**
If Supabase Realtime is added for cross-device sync, the subscription is established in a `useEffect`. In React StrictMode (which `src/main.jsx` uses via React 19), effects run twice in development. The subscription is created, torn down (via cleanup), then created again. Supabase's realtime-js has a known issue where the second subscribe() receives a CLOSED signal immediately, leaving the subscription in a broken state — data changes on other devices are not received.

**Why it happens:**
React 19 StrictMode intentionally double-fires effects to expose missing cleanup. Supabase Realtime does not handle the rapid subscribe/unsubscribe/subscribe sequence gracefully in all versions.

**How to avoid:**
- If Realtime subscriptions are added, always provide a cleanup function: `return () => supabase.removeChannel(channel)`.
- Test subscription behavior specifically in development mode (not just production build) where StrictMode double-fires.
- If Realtime is not needed for the current refactoring milestone (it is not in scope per PROJECT.md), do not add it — stick to fetch-on-load + optimistic updates.
- If added later, use a `useRef` to track whether the subscription is already active, preventing double-subscription.

**Warning signs:**
- A `useEffect` establishes a Supabase channel but has no return cleanup function
- In development, data changes made on another tab are not reflected in the current tab
- Console shows "CLOSED" immediately after "SUBSCRIBED" in Supabase channel logs

**Phase to address:**
Phase 3 (Supabase DB Migration), if Realtime is introduced. If not, this pitfall is not triggered.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Extract hooks without TypeScript types | Faster hook extraction | Refactoring bugs are invisible; wrong prop shapes silently accepted | Never — add JSDoc types at minimum even without full TS migration |
| Leave `any` localStorage keys as magic strings | No refactor needed now | Multiple hooks write to same key differently; collision on migration | Never — create constants file first |
| Migrate schedules first, leave templates in localStorage | Reduces scope | Dual-write gap; users see inconsistent data across data types | Acceptable only if migration bridge handles fallback reads |
| Skip RLS during table creation and add later | Faster table setup | Data accessible to all users; policy gaps are hard to audit retroactively | Never — always create policy at table creation |
| Copy-paste useEffect from monolith into hook unchanged | Preserves existing behavior | Stale closure bugs, missing dependencies, dependency array drift | Never — always review and fix deps on extraction |
| Use `window.location.reload()` instead of selective refresh | Quick fix | Loses all in-memory state; bad UX; hides architectural problems | Never during refactoring — fix the selective refresh |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth + RLS | Checking auth in application code instead of policy | Write `auth.uid() = user_id` policies; don't rely on application-level guards |
| Supabase `user_data` table (existing) | Assuming all users have rows; calling `.single()` which throws on missing row | Use `.maybeSingle()` or check for null before accessing returned row |
| Google Calendar OAuth hash | Reading `window.location.hash` in multiple places | Centralize hash reading to one effect in `useGoogleCalendar`; clean hash immediately |
| Supabase `upsert()` with `onConflict` | Forgetting `onConflict` column specification; inserts duplicates | Always specify `{ onConflict: 'user_id' }` or equivalent unique column |
| Vercel serverless + Supabase | Using `service_role` key in API routes that don't need admin access | Use `anon` key + RLS for user-scoped operations; `service_role` only for admin actions |
| `@dnd-kit` drag-and-drop + async save | Updating UI order after Supabase confirms (slow) | Update UI order immediately on drag-end; write to Supabase async |
| Supabase JSON columns | Storing complex objects as `jsonb`; no schema enforcement | Add Zod validation on reads; prefer relational tables with typed columns |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No `useCallback` on hook return values | Every render of parent re-runs all child useEffects that depend on those functions | Wrap all hook-returned functions in `useCallback` | Immediately in development; invisible until profiler is checked |
| All 50+ state variables in one component (not split into hooks) | Any state change re-renders entire app including dnd-kit and html2canvas components | Extract state into domain hooks; only pass needed state to each component | At 50+ state variables — already happening |
| `useEffect` with no cleanup for async fetch | Multiple in-flight requests race; last response wins regardless of order | Use `AbortController`; cancel on cleanup | When user navigates quickly between tabs |
| Supabase `select()` without RLS index | Full table scan per query; exponential slowdown as user count grows | Add `CREATE INDEX ON table(user_id)` for every RLS-protected table | At ~1,000 rows per table |
| Supabase Realtime + React StrictMode double subscription | Dev-only: live updates stop working; makes debugging harder | Always add cleanup return; test in dev mode explicitly | In development only, but hides production readiness |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `gcal_token` and `gcal_refresh_token` in localStorage | XSS attack reads tokens; refresh token never expires; full Google account compromise | Move to httpOnly cookies via `api/gcal-token-store.js` Vercel route; never touch localStorage for OAuth tokens |
| `biometric_cred_id` in localStorage | Credential ID extracted and potentially replayed | Store only enrollment flag in localStorage; keep credential ID server-side in Supabase |
| Hardcoded `ADMIN_EMAILS = ['hare_table@naver.com']` | Adding admin requires code deploy; not in RLS policies | Migrate to `user_roles` table in Supabase; check role via RLS or server-side query |
| Missing Supabase RLS on new tables | Any authenticated user can read/modify any user's data | Enable RLS at table creation; policy `auth.uid() = user_id`; verify with anon-key test |
| `JSON.parse()` without try-catch on localStorage reads | Corrupted storage crashes app; no error boundary catches it | Wrap all `JSON.parse()` in try-catch; validate with Zod; fallback to empty defaults |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Supabase write blocks UI (awaiting response before updating state) | Schedule create feels slow (200-500ms lag); user double-clicks → duplicate created | Update state immediately; write async; show "saving" indicator only if write takes >800ms |
| Clearing localStorage during migration without migrating data first | User loses months of schedules and templates on first login after deploy | Migration bridge reads localStorage, writes to Supabase, only then clears localStorage |
| `window.location.reload()` on pull-to-refresh (line 1207) | Full app reload; any unsaved state lost; slow | Replace with targeted `refetch()` calls per data domain after hook extraction |
| No error feedback when Supabase write fails | User thinks data saved; it didn't; next reload shows old data | Every write must have `.catch()` that shows a toast and rolls back optimistic update |
| Simultaneous localStorage and Supabase as source of truth | User confused when data differs across devices during migration window | Ship migration per data type atomically; no feature should have both sources active at once |

---

## "Looks Done But Isn't" Checklist

- [ ] **Hook Extraction:** Hook compiles and renders — verify the hook's state survives a hard refresh (localStorage/Supabase fallback works)
- [ ] **Supabase Table Migration:** Table created — verify RLS is enabled, anon user cannot access other users' rows
- [ ] **Google Calendar OAuth:** Token stored in new location — verify token refresh works 60+ minutes after initial auth (not just on first connect)
- [ ] **Data Migration Bridge:** Migration function written — verify it runs for a user with existing localStorage data, not just new users
- [ ] **Drag-and-Drop Order:** Order saves to Supabase — verify order persists after page reload, not just in memory
- [ ] **Biometric Unlock:** Extraction complete — verify enrollment and unlock both work after hook extraction (WebAuthn flow is stateful)
- [ ] **Theme/Font Size:** Moved from localStorage — verify preference loads before first paint (no flash of default theme)
- [ ] **Admin Control:** Hardcoded email removed — verify admin panel is inaccessible to non-admin accounts after role table migration

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Feature parity broken after big-bang extraction | HIGH | Revert to last known-good commit; re-extract one domain at a time with smoke tests between |
| localStorage key collision across hooks | MEDIUM | Audit all localStorage calls with grep; consolidate to constants file; test each key read/write pair |
| User data loss during migration (localStorage cleared before Supabase write confirmed) | HIGH | Restore from Supabase backup if available; add migration rollback function that reads Supabase and writes back to localStorage |
| RLS missing on shipped table | HIGH | Add policy immediately in Supabase dashboard (no code deploy needed); audit logs for unauthorized access; notify affected users |
| Google Calendar token broken after refactoring | MEDIUM | Reconnect flow is self-healing (user clicks "Connect Google Calendar" again); fix the hook and re-deploy |
| useEffect infinite loop from missing useCallback | LOW | React DevTools Profiler identifies the component; add useCallback to hook return value; re-test |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Big-bang feature parity breakage | Phase 1 (Foundation) | Smoke test checklist exists and is run before each PR merge |
| localStorage key collision | Phase 1 (Foundation) | `src/constants/storageKeys.ts` exists; no string literal localStorage keys in any other file |
| Shared state without clear owner | Phase 2 (Hook Extraction) | State dependency map documented before hook writing begins |
| useEffect dependency arrays broken | Phase 2 (Hook Extraction) | ESLint `exhaustive-deps` shows zero warnings; Profiler shows no unexpected re-renders |
| Google Calendar token flow broken | Phase 2 (Hook Extraction) | Full OAuth flow tested manually end-to-end after `useGoogleCalendar` extraction |
| Supabase RLS omitted | Phase 3 (Supabase Migration) | Every table has RLS enabled; anon-key test cannot read other users' rows |
| localStorage-Supabase dual-write gap | Phase 3 (Supabase Migration) | Migration function tested with a user who has existing localStorage data |
| Optimistic update flicker | Phase 3 (Supabase Migration) | Drag-and-drop does not snap back; saves show no visible delay in normal network conditions |
| Supabase Realtime StrictMode leak | Phase 3 (Supabase Migration) | All channel subscriptions have cleanup return; tested in development mode |
| Security: tokens in localStorage | Phase 4 (Security Hardening) | `gcal_token` and `gcal_refresh_token` not present in localStorage after login; stored in httpOnly cookies |

---

## Sources

- Codebase analysis: `src/BloggerMasterApp.jsx` (4,243 lines, 87 useState, 65 localStorage calls, 18 useEffect)
- `.planning/codebase/CONCERNS.md` — project-specific concern audit
- `.planning/codebase/ARCHITECTURE.md` — current architecture analysis
- [React Strict Mode official docs — double-fire behavior](https://react.dev/reference/react/StrictMode)
- [Why useEffect Running Twice in React 19 Strict Mode — DEV Community](https://dev.to/pockit_tools/why-is-useeffect-running-twice-the-complete-guide-to-react-19-strict-mode-and-effect-cleanup-1n60)
- [Supabase Realtime duplicate event handling](https://drdroid.io/stack-diagnosis/supabase-realtime-duplicate-event-handling)
- [Supabase Realtime + React StrictMode subscription issue](https://github.com/supabase/realtime-js/issues/169)
- [Supabase RLS performance and best practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase Row Level Security docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Concurrent optimistic updates in React Query — Dominik Dorfmeister (TkDodo)](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)
- [React hooks pitfalls — Kent C. Dodds](https://kentcdodds.com/blog/react-hooks-pitfalls)
- [Refactoring components in React with custom hooks — CodeScene](https://codescene.com/blog/refactoring-components-in-react-with-custom-hooks)
- [Why big-bang refactors are never a good idea — microservices.io](https://microservices.io/post/architecture/2024/06/27/stop-hurting-yourself-by-doing-big-bang-modernizations.html)
- [React hooks deep dive: patterns, pitfalls — DEV Community](https://dev.to/a1guy/react-hooks-deep-dive-patterns-pitfalls-and-practical-hooks-424k)
- [Supabase best practices — leanware.co](https://www.leanware.co/insights/supabase-best-practices)

---
*Pitfalls research for: React monolithic refactoring — BloggerMasterApp.jsx decomposition*
*Researched: 2026-04-06*
