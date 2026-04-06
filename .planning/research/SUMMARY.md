# Project Research Summary

**Project:** Blue Review — React monolith refactoring + localStorage-to-Supabase migration
**Domain:** React SPA structural refactoring (monolith decomposition, data layer migration)
**Researched:** 2026-04-06
**Confidence:** HIGH

## Executive Summary

The Blue Review app is a working React 19 SPA for Korean bloggers managing schedules, templates, and Google Calendar sync. The core problem is architectural: `BloggerMasterApp.jsx` has grown to 4,243 lines with 87 `useState` declarations, 65 localStorage calls, and 18 `useEffect` hooks, all in a single component scope. The user-facing product works and must remain visually and functionally identical after this refactoring — there are no new features, no UI changes, and no framework migration. The goal is solely structural: break the monolith into feature-based modules, replace direct localStorage persistence with Supabase DB, and fix the silent errors and security gaps documented in CONCERNS.md.

The recommended approach is a sequential, feature-by-feature extraction using the Strangler Fig pattern. Each domain (schedules, templates, profile, hashtags, saved texts, Google Calendar, preferences) is extracted into its own service layer, custom hook, and screen component — one at a time, with a manual smoke test between each extraction. Four new libraries are added: Zustand 5 for UI state, TanStack Query v5 for Supabase data fetching, Zod v4 for runtime validation of parsed data, and react-error-boundary for error containment. All four are verified React 19 compatible and add negligible bundle size compared to their risk-reduction value.

The dominant risk is a big-bang extraction that silently breaks feature parity. A secondary risk is the localStorage-to-Supabase migration creating a dual-write gap where users lose data. Both are mitigated by the feature-by-feature approach with a migration bridge (read from Supabase, fall back to localStorage, write to Supabase, then delete localStorage key only after Supabase is confirmed). Security must be addressed in parallel: Google Calendar OAuth tokens currently stored in localStorage represent a full account takeover risk on XSS, and Supabase RLS must be enabled on every table at creation time, not as an afterthought.

---

## Key Findings

### Recommended Stack

The existing stack (React 19, Vite 8, Tailwind CSS 4, @supabase/supabase-js 2) is locked and unchanged. Four libraries are added to support the refactoring goals. Zustand 5 handles UI-only state (active tab, modal flags, biometric unlock status) that does not belong in Supabase. TanStack Query v5 replaces all manual `useEffect` + `useState` data-fetching patterns with caching, background refetch, and optimistic update support. Zod v4 validates every `JSON.parse()` call and all Supabase response shapes before use — directly addressing the 9 unguarded parse calls that can crash the app. react-error-boundary v6 wraps the hook-unfriendly class component API and explicitly supports React 19. The React Compiler built into React 19 handles auto-memoization in most cases, eliminating the need to manually audit `useCallback`/`useMemo` except for hook return values consumed by `useEffect`.

**Core technologies (additive):**
- **Zustand 5.0.12:** UI state store — zero boilerplate, selector-based, React 19 compatible
- **@tanstack/react-query 5.96.2:** Supabase data fetching, caching, mutations, cache invalidation
- **Zod 4.3.6:** Runtime validation for localStorage migration and Supabase response shapes
- **react-error-boundary 6.1.1:** Declarative error boundaries per feature module

**What NOT to add:** Redux Toolkit (overkill boilerplate for solo dev), SWR (duplicate with React Query), MobX (paradigm shift with no payoff), localStorage for any new state.

### Expected Features

Research maps refactoring capabilities, not user-facing features. The product's user-visible behavior does not change.

**Must have (table stakes — P1, blocking for milestone completion):**
- Component splitting: `BloggerMasterApp.jsx` → feature-based screen components
- Custom hooks per domain: `useSchedules`, `useTemplates`, `useProfile`, `useHashtags`, `useSavedTexts`, `useGoogleCalendar`, `useWeather`, `useSubscription`, `usePreferences`
- Supabase DB tables with RLS for schedules, templates, hashtags, saved texts, profile
- Data access service layer: `userDataService`, `googleCalendarService`, `weatherService`
- Safe `JSON.parse` with Zod validation and fallback to empty defaults
- Error boundaries in `App.jsx` and at feature level for Calendar and Templates
- Silent error catch replacement with user-visible toasts
- Google Calendar token moved out of localStorage to Supabase (security)
- Feature-based folder structure: `src/screens/`, `src/hooks/`, `src/services/`, `src/lib/`

**Should have (P2, include if capacity allows):**
- TanStack Query adoption (replaces manual fetch + `useState` — removes ~200 lines)
- Constants file for all localStorage keys and magic strings
- Selective data refresh via `invalidateQueries` (replaces `window.location.reload()`)
- Google Calendar token expiry pre-check before API calls
- Admin roles via Supabase `user_roles` table (removes hardcoded admin email)
- Utility layer extraction: `dateUtils.js`, `brandUtils.js`, `imageExport.js`

**Defer (P3 — separate milestone, do not mix in):**
- TypeScript migration — requires stable structure first
- Full test suite — moving target during active restructuring
- List virtualization — unproven need at actual user scale
- i18n — no business requirement

### Architecture Approach

The target architecture has four layers: (1) services — async functions that call Supabase or external APIs, no React state; (2) hooks — domain state owners that call services, one hook per domain; (3) screens — pure JSX composition that calls hooks and passes data as props to child components; (4) shared components — stateless UI primitives with no direct Supabase access. The existing Supabase structure (single `user_data` row per user with `jsonb` columns for each domain) is kept; `userDataService.js` encapsulates the existing upsert pattern and makes it reusable across hooks. Preferences (font size, theme color, UI collapse flags) stay in localStorage via `usePreferences` because they are device-specific, not user data.

**Major components:**
1. **`App.jsx`** — auth gate (loading / password reset / login / biometric lock / shell)
2. **`BloggerShell`** — navigation, tab state, global layout frame (replaces `BloggerMasterApp`)
3. **`screens/`** — one screen per tab (`HomeScreen`, `ScheduleScreen`, `CalendarScreen`, `ToolsScreen`, `ProfileScreen`)
4. **`hooks/`** — 10 domain hooks, each owning state + calling services
5. **`services/`** — `userDataService`, `googleCalendarService`, `weatherService`, `subscriptionService`
6. **`lib/`** — pure utilities: `dateUtils`, `brandUtils`, `imageExport`, `supabase` singleton

### Critical Pitfalls

1. **Big-bang refactor breaks feature parity silently** — extract one domain at a time with a manual smoke-test checklist (login, create schedule, edit template, gcal sync, biometrics) run after each PR. Never merge a PR that touches more than two feature domains at once.

2. **localStorage key collision during extraction** — create `src/constants/storageKeys.js` with every key as a named export before writing a single extracted hook. String literal `'blogSchedules'` must not appear in any file other than this constants file.

3. **localStorage-to-Supabase dual-write gap** — implement a three-phase migration per data type: read Supabase first, fall back to localStorage and write to Supabase if empty, then write to Supabase only, then delete localStorage key. A `migrateUserData()` function must run once per user at login.

4. **Supabase RLS omitted at table creation** — enable RLS on every table at creation time with `auth.uid() = user_id`. Add `user_id` index immediately. Never use `service_role` key in browser code. Test with an anon-key query that must fail.

5. **Google Calendar token flow broken after extraction** — the entire gcal token lifecycle (hash listener + token state + refresh logic + disconnect) must move to `useGoogleCalendar` as a single atomic extraction. Test the full OAuth flow end-to-end after extraction. Move tokens from localStorage to httpOnly cookies via a Vercel API route.

6. **useEffect dependency arrays broken after hook extraction** — wrap all hook-returned functions in `useCallback`. Treat every `react-hooks/exhaustive-deps` ESLint warning as a blocker. Verify with React DevTools Profiler that render count is bounded after each extraction.

7. **Optimistic update flicker on Supabase writes** — update local state immediately, write to Supabase async. Never `await` before updating UI. Roll back local state and show error toast on write failure. Critical for drag-and-drop reordering.

---

## Implications for Roadmap

Research reveals a clear dependency ordering: services before hooks, hooks before screens, simpler screens before complex ones, shell last. The migration bridge must exist before any data is moved. Security hardening (RLS, token storage) must happen at the same time tables are created, not after.

### Phase 1: Foundation and Safety Net

**Rationale:** Before any structural change, the project needs a smoke-test protocol, a storage constants file, and error boundaries. These protect against regression during the refactoring and must exist before any code moves.
**Delivers:** Refactoring protocol documented; `src/constants/storageKeys.js` created; error boundaries added to `App.jsx`; all four new libraries installed; `QueryClientProvider` added to `App.jsx`.
**Addresses:** Component splitting prerequisites, error boundaries (P1), constants extraction (P2)
**Avoids:** Big-bang feature parity breakage (Pitfall 1), localStorage key collision (Pitfall 2)
**Research flag:** Standard patterns — skip phase research

### Phase 2: Service and Utility Layer

**Rationale:** Hooks import services; services have no React dependency. Services must exist before hooks can be written. Extracting pure utilities and service functions is the lowest-risk refactoring step with immediate value.
**Delivers:** `src/lib/dateUtils.js`, `src/lib/brandUtils.js`, `src/lib/imageExport.js`; `src/services/userDataService.js`, `googleCalendarService.js`, `weatherService.js`, `subscriptionService.js`; all Supabase calls centralized.
**Uses:** Existing `supabase.js` singleton; existing Supabase upsert pattern (lines 885-898 of monolith)
**Implements:** Service / repository layer
**Avoids:** Multiple Supabase calls per state change (Anti-Pattern 4 in ARCHITECTURE.md)
**Research flag:** Standard patterns — skip phase research

### Phase 3: Domain Hook Extraction

**Rationale:** Hooks are the structural spine of the refactored app. Each domain hook removes 300-600 lines from the monolith and enables independent component rendering. The state dependency map must be completed before extraction begins.
**Delivers:** All 10 domain hooks extracted: `usePreferences`, `useWeather`, `useProfile`, `useTemplates`, `useHashtags`, `useSavedTexts`, `useSubscription`, `useGoogleCalendar`, `useSchedules`; `useCallback` applied to all hook return values; Zustand store for UI-only state.
**Uses:** Zustand 5 for UI state; Zod v4 for safe `JSON.parse` wrapping; services from Phase 2
**Implements:** Feature hook layer
**Avoids:** Shared state without clear owner (Pitfall 4), useEffect dependency array breakage (Pitfall 7), gcal token flow breakage (Pitfall 6 — extract gcal hook last)
**Research flag:** Standard patterns for most hooks; `useGoogleCalendar` is highest risk — may need manual OAuth flow documentation review

### Phase 4: Supabase DB Migration

**Rationale:** The data migration is the riskiest phase because existing user data in localStorage must be preserved. Tables must be created with RLS from the start. The migration bridge (read Supabase, fall back to localStorage, migrate, then delete) must be built as the first component of this phase.
**Delivers:** Supabase tables for schedules, templates, hashtags, saved texts with RLS; `migrateUserData()` function; three-phase migration per data type; TanStack Query `useQuery`/`useMutation` replacing manual fetch patterns; `window.location.reload()` replaced with `invalidateQueries`.
**Uses:** TanStack Query v5; Supabase `user_data` row with jsonb columns (existing schema)
**Implements:** Supabase DB as sole persistence layer for user data
**Avoids:** RLS omission (Pitfall 5), dual-write gap (Pitfall 3), optimistic update flicker (Pitfall 8), Supabase Realtime StrictMode leak (Pitfall 9 — do not add Realtime in this phase)
**Research flag:** Needs careful execution — migration bridge has no automated safety net. Manual testing with a seeded localStorage account required.

### Phase 5: Screen Extraction and Shell Replacement

**Rationale:** Screens are the last structural layer; they compose hooks and components. Extract simpler screens first. `ScheduleScreen` is last because it has the most cross-domain dependencies (schedules + gcal + templates + image export).
**Delivers:** All screens extracted: `ToolsScreen`, `CalendarScreen`, `HomeScreen`, `ProfileScreen`, `ScheduleScreen`; `BloggerShell.jsx` replaces `BloggerMasterApp.jsx`; monolith deleted; silent error catches replaced with toasts.
**Uses:** react-error-boundary at feature level for Calendar and Schedule screens
**Implements:** Screen / page layer; shell layer
**Avoids:** Recreating the monolith inside a screen (Anti-Pattern 1), prop drilling beyond two levels (Anti-Pattern 2)
**Research flag:** Standard patterns — skip phase research

### Phase 6: Security Hardening

**Rationale:** Google Calendar tokens in localStorage are a security vulnerability documented in CONCERNS.md. Hardcoded admin email in source requires code deploy to change. These are P1 items that were deferred to their own phase to avoid mixing security and structural concerns.
**Delivers:** `gcal_token` and `gcal_refresh_token` moved from localStorage to httpOnly cookies via Vercel API route; `biometric_cred_id` secured; admin roles migrated from hardcoded constant to Supabase `user_roles` table; all security items in PITFALLS.md security section addressed.
**Uses:** Existing Vercel serverless `api/` directory; Supabase `user_roles` table (new)
**Implements:** Security baseline for pre-launch
**Avoids:** XSS token theft (full Google account compromise), unauthorized admin access
**Research flag:** Token storage via httpOnly cookies + Vercel serverless may need API route design research

### Phase Ordering Rationale

- **Foundation before any code moves:** The smoke-test checklist and constants file prevent regressions from the start. Adding them after the first extraction is too late — regressions already hide.
- **Services before hooks before screens:** This is a hard dependency: screens import hooks, hooks import services. Reversing this order requires rework.
- **Migration (Phase 4) after hooks are stable:** The migration bridge reads from hooks; if hooks are still in flux during migration, the bridge's fallback logic is unreliable.
- **Security last but before launch:** Token security requires the gcal hook to be fully extracted (Phase 3) and the Supabase tables to exist (Phase 4) before tokens can be moved to the database/cookies.
- **gcal hook extracted last within Phase 3:** The most complex and stateful hook, with the highest regression risk. All simpler hooks (profile, templates) are proven patterns by the time it is attempted.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Supabase Migration):** The three-phase migration bridge has no automated fallback. Edge cases include: user with no Supabase row yet, user with partial migration (some keys in Supabase, some still in localStorage), network failure mid-migration. Each case needs a documented handling strategy before implementation.
- **Phase 6 (Security — gcal tokens):** Moving tokens to httpOnly cookies requires a Vercel API route that sets the cookie and a client-side fetch that does not expose the token to JavaScript. The exact cookie strategy (session vs persistent, domain scope) needs verification against the Vercel deployment configuration.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Installing libraries, adding `QueryClientProvider`, creating a constants file — all well-documented, zero ambiguity.
- **Phase 2 (Services):** Extracting pure async functions with no React dependency is the lowest-risk refactoring operation with established patterns.
- **Phase 3 (Hooks) — most hooks:** Domain hook extraction follows well-documented React patterns. The pattern is the same for every hook; only `useGoogleCalendar` has novel complexity.
- **Phase 5 (Screens):** Screen extraction follows directly from the completed hooks. No novel architectural decisions remain at this layer.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All library versions verified via npm registry; peer dependency compatibility confirmed; no conflicts |
| Features | HIGH | Based on direct codebase analysis (CONCERNS.md, actual source); what is broken is observable, not inferred |
| Architecture | HIGH | Target architecture derived from existing Supabase patterns already in the codebase; no speculation required |
| Pitfalls | HIGH | Pitfalls identified from actual code analysis (87 useState, 65 localStorage calls, 18 useEffect) plus verified external sources |

**Overall confidence:** HIGH

### Gaps to Address

- **Migration bridge edge cases:** The three-phase migration strategy is sound in principle, but the exact handling for users with partial migrations (some data in Supabase, some still in localStorage) was not fully specified in research. Flag for Phase 4 planning.
- **Google Calendar token cookie strategy:** Vercel serverless httpOnly cookie implementation requires knowledge of the specific Vercel deployment configuration (domain, environment variables). Needs verification against `api/` directory structure during Phase 6 planning.
- **Single `user_data` row vs. normalized tables:** Research recommends keeping the existing single-row jsonb approach for this refactoring milestone. If user count grows beyond ~1,000, normalized tables per domain will be needed. This is a future architectural decision, not an immediate concern.
- **Zustand vs. no global store:** ARCHITECTURE.md concludes that custom hooks without a global store are sufficient at this app's scale. STACK.md adds Zustand for UI state. Both are correct — the distinction is that Zustand handles cross-screen UI flags (biometricLocked, activeTab) while domain data stays in React Query. This distinction must be made explicit in Phase 1 to prevent developers from using Zustand as a data cache.

---

## Sources

### Primary (HIGH confidence)
- `src/BloggerMasterApp.jsx` — direct codebase analysis (4,243 lines, 87 useState, 65 localStorage calls, 18 useEffect)
- `.planning/codebase/CONCERNS.md` — project-specific concern audit
- `.planning/codebase/ARCHITECTURE.md` — current architecture analysis
- `npm show zustand`, `npm show @tanstack/react-query`, `npm show react-error-boundary`, `npm show zod` — version verification
- [React v19 official blog](https://react.dev/blog/2024/12/05/react-19) — React Compiler auto-memoization
- [Supabase Row Level Security docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS patterns
- [Supabase RLS performance best practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

### Secondary (MEDIUM confidence)
- [TanStack Query + Supabase integration](https://makerkit.dev/blog/saas/supabase-react-query) — Supabase + React Query patterns
- [State Management in 2025](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k) — Zustand ecosystem positioning
- [Zod v4 release notes](https://www.infoq.com/news/2025/08/zod-v4-available/) — v4 performance improvements
- [Zustand vs Redux vs Jotai — Better Stack](https://betterstack.com/community/guides/scaling-nodejs/zustand-vs-redux-toolkit-vs-jotai/) — comparative analysis
- [React folder structure — Robin Wieruch](https://www.robinwieruch.de/react-folder-structure/) — feature-based structure
- [Concurrent optimistic updates — TkDodo](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) — optimistic update pattern
- [Big-bang refactor anti-pattern](https://microservices.io/post/architecture/2024/06/27/stop-hurting-yourself-by-doing-big-bang-modernizations.html) — Strangler Fig rationale

### Tertiary (LOW confidence)
- [Supabase Realtime StrictMode issue](https://github.com/supabase/realtime-js/issues/169) — StrictMode double-subscription bug (applies only if Realtime is added)

---
*Research completed: 2026-04-06*
*Ready for roadmap: yes*
