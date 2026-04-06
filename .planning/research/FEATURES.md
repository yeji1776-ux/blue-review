# Feature Research

**Domain:** React SPA refactoring — monolith-to-modular migration with Supabase data layer
**Researched:** 2026-04-06
**Confidence:** HIGH (based on existing codebase analysis) / MEDIUM (best practice patterns from community sources)

---

## Context: This Is a Refactoring, Not a Greenfield Build

This research maps *refactoring capabilities* rather than user-facing features. The user-facing product is already built and must remain identical. The "features" here are structural improvements: what needs to exist in the codebase for it to be maintainable.

Categories are answered from two lenses:
- **Maintainability lens:** What makes the code unmaintainable right now?
- **Correctness lens:** What is currently broken or fragile that refactoring should fix?

---

## Feature Landscape

### Table Stakes (Code Becomes Unmaintainable Without These)

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| **Component splitting (BloggerMasterApp → feature modules)** | 4,243-line file is unnavigable. Bugs are hard to locate. Changes risk breaking unrelated features. Any PR is a conflict magnet. | HIGH | Decompose by tab/domain: `Schedule/`, `Templates/`, `Calendar/`, `Profile/`, `Settings/`. Inline sub-components (PasswordResetScreen, BiometricLockScreen) move to `src/components/`. |
| **Custom hooks per feature domain** | 50+ useState in one component means unrelated state changes cause full re-renders. Logic is untestable. | HIGH | Extract: `useSchedules`, `useTemplates`, `useProfile`, `useWeather`, `useGoogleCalendar`. Each hook owns its state and side effects. |
| **Supabase DB tables for schedules and templates** | localStorage = data loss on browser clear, no cross-device sync. Already identified as high-priority before launch. Supabase DB is already in the stack but unused for user data. | HIGH | Tables needed: `schedules`, `templates`, `ftc_templates`, `user_profiles`. RLS policies tied to `auth.uid()`. |
| **Data access layer (service functions)** | Direct Supabase SDK calls scattered through components creates untestable, duplicated DB logic. | MEDIUM | Create `src/services/scheduleService.js`, `templateService.js`, etc. Each exports async CRUD functions. Hooks call services, not Supabase directly. |
| **Safe JSON.parse / data validation on load** | 9 unguarded JSON.parse calls crash the app on corrupted localStorage. Post-migration, malformed DB rows cause the same issue. | MEDIUM | Wrap all parse calls. Use Zod schemas for schedule/template shape validation. Fallback to safe defaults. |
| **Error boundaries** | No React Error Boundary exists. Any thrown error (JSON parse, third-party library bug) kills the entire app with a blank screen. | LOW | Add one ErrorBoundary in `src/App.jsx`. Add feature-level boundaries for Calendar and Templates which have complex async flows. |
| **Consistent error handling (no silent swallows)** | Six `.catch(() => {})` blocks mean users never know when geolocation, weather, or calendar sync fails. | MEDIUM | Replace silent catches with toast notifications. Centralize error-to-message translation (currently duplicated between LoginPage and BloggerMasterApp). |
| **Google Calendar token security** | Tokens passed through URL hash and stored as plain strings in localStorage. Full account takeover risk if XSS occurs. | HIGH | Store tokens in Supabase DB (encrypted column or separate secure table) rather than localStorage. Clean URL hash immediately after read with `window.history.replaceState`. |
| **Feature-based folder structure** | Everything is in `src/` root. No discoverability. Onboarding new developers requires reading 4,243 lines to understand the app. | MEDIUM | `src/features/{schedule,template,calendar,profile,settings}/` each with `components/`, `hooks/`, `services/`. Shared code in `src/shared/`. |
| **Constants and magic string extraction** | Tab names `'home'`, `'calendar'`, `'profile'`, plan limits, and admin emails are scattered magic values. Changing one requires grep across the file. | LOW | Create `src/constants/` with `tabs.js`, `plans.js`, `routes.js`. Replace hardcoded admin emails with Supabase `user_roles` table lookup. |

### Differentiators (Raise Code Quality Beyond Just "Split the File")

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **TanStack Query (React Query v5) for Supabase data fetching** | Replaces manual fetch + useState + useEffect patterns. Gives automatic caching, background refetch, loading/error states, and deduplication. Removes ~200 lines of manual cache management. Integrates cleanly with Supabase per current docs (Jan 2026). | MEDIUM | Use `useQuery` for reads, `useMutation` for writes. Query keys per feature domain. Invalidate on mutation. Removes the pull-to-refresh full page reload (currently `window.location.reload()`). |
| **useCallback and useMemo on event handlers passed to dnd-kit** | Drag-and-drop handlers are recreated every render. SortableTemplateItem and SortableHomeTemplateButton re-render unnecessarily. With React Compiler (React 19+) this may be automatic, but explicit memoization is the safe baseline. | LOW | Apply to handlers passed as props: `onDragEnd`, `onSave`, `onDelete`. React.memo on list item components. |
| **Selective data refresh (replace window.location.reload)** | Pull-to-refresh currently calls `window.location.reload()` destroying all state. Replacing with TanStack Query `invalidateQueries` gives instant, state-preserving refresh. | LOW | Depends on TanStack Query adoption. One-line fix once query layer exists. |
| **Google Calendar token expiry check before API calls** | Refresh token is never checked before use. Silent failures when token expires. Pre-call expiry check with auto-refresh removes a class of user-reported bugs. | MEDIUM | Check `gcal_expiry` (stored in DB) before each Calendar API call. If expiry < 5 min, call refresh endpoint first. Show warning if refresh fails. |
| **Utility layer (`src/utils/`)** | Date formatting, data serialization, and list manipulation are inlined throughout. Extracting to utils enables reuse and reduces duplication. | LOW | `dateUtils.js`, `storageUtils.js` (for migration helpers), `arrayUtils.js`. |
| **Admin role via Supabase `user_roles` table** | Admin emails hardcoded in source (`ADMIN_EMAILS = ['hare_table@naver.com']`). Changing admins requires code deploy. DB-driven roles require no deploy. | LOW | Simple `user_roles` table with `user_id` + `role` columns. Existing `get_all_users_admin` RPC already shows intent. |

### Anti-Features (Do NOT Do These During Refactoring)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full TypeScript migration** | Type safety is genuinely valuable. CONCERNS.md flags JS-only as a weakness. | Scope creep. Converting 4,243 lines of JSX to TSX simultaneously with structural refactoring doubles the diff, multiplies merge conflicts, and extends timeline by months. The refactoring milestone explicitly excludes it. | Add a `types.js` JSDoc comment file to document shapes. Plan TS migration as its own milestone after structure is stable. |
| **Redux or Zustand introduction** | Global state management is a common "fix" for prop drilling. | The root problem is a monolith, not missing global state. Introducing a store while splitting components adds a new abstraction before the split is validated. Research confirms: custom hooks per domain is sufficient for this app's scale. | Custom hooks (useSchedules, useTemplates, etc.) + React Context for auth state. Add Zustand only if cross-feature state sharing becomes painful after the split. |
| **UI redesign during refactoring** | Developers naturally improve UI while touching components. | Mixing structural and visual changes makes regression testing impossible. If a feature breaks, it's unclear whether refactoring or the UI change caused it. PROJECT.md explicitly excludes UI changes from this milestone. | Strict rule: no className changes, no layout changes. UI improvements deferred to a separate milestone handled by Gemini. |
| **Adding new features** | Refactoring touches all areas; it feels efficient to add features in the same pass. | Every new feature added during refactoring is an unvalidated assumption. Feature parity is the success criterion for this milestone. | Log feature ideas in a backlog. Implement them only after the refactoring milestone is closed and verified. |
| **Test suite introduction simultaneously with refactoring** | Tests should accompany new code. | Writing tests for code being actively restructured creates a moving target. Tests break on every structural change, adding rework instead of value. CONCERNS.md defers tests to after structure stabilizes. | Write smoke tests for critical auth flows only. Full test suite is a separate milestone. |
| **Internationalization (i18n) library** | All strings are Korean hardcoded; adding i18n seems like a natural cleanup. | Extracting strings from 4,243 lines is a large mechanical task unrelated to structural refactoring. Changes every file. No business requirement for multiple languages. | Keep Korean strings as-is. If i18n becomes a requirement, do it as a focused text-extraction pass, not during structural refactoring. |
| **Service worker / offline support** | Offline support improves UX, especially on mobile. | Requires architectural decisions (cache strategy, sync conflicts) that should not be made mid-refactoring. CONCERNS.md marks this as low priority. | Defer to a future milestone. App currently has no offline requirements. |
| **Virtualizing lists (react-window)** | CONCERNS.md flags large list re-renders as a performance issue. | Most users have small datasets (blogger, not enterprise). Virtual lists add complexity before the performance problem is proven at scale. Premature optimization. | Apply React.memo to list items as part of component split. Revisit virtualization only if profiling confirms it as a bottleneck. |

---

## Feature Dependencies

```
[Supabase DB tables] 
    └──required by──> [Data access layer / service functions]
                          └──required by──> [Custom hooks per domain]
                                                └──required by──> [Component splitting]

[Component splitting]
    └──enables──> [useCallback / useMemo optimization]
    └──enables──> [Feature-based folder structure]

[Safe JSON.parse / Zod validation]
    └──required before──> [Supabase DB migration] (validate data being written)

[TanStack Query]
    └──enhances──> [Custom hooks per domain] (replaces manual useEffect fetch patterns)
    └──enables──> [Selective data refresh] (replaces window.location.reload)

[Error boundaries]
    └──required alongside──> [Component splitting] (split components can fail independently)

[Google Calendar token security]
    └──requires──> [Supabase DB tables] (tokens stored in DB, not localStorage)

[Constants extraction]
    └──required before──> [Admin role via Supabase] (remove ADMIN_EMAILS constant)
```

### Dependency Notes

- **Supabase DB tables must precede everything else:** The data layer is the foundation. Custom hooks cannot cleanly own state if they still read from localStorage. Migration must happen before or in parallel with hook extraction, not after.
- **Component splitting requires hook extraction first (or in parallel):** If components are split while all state remains in BloggerMasterApp, the result is prop drilling across 50+ props. Hook extraction and splitting should be done feature-by-feature together.
- **TanStack Query is optional but high-leverage:** The refactoring works without it (custom hooks + raw Supabase calls), but TanStack Query removes an entire class of manual state management code. Adopt it from the start of the data layer, not as a retrofit.
- **Error boundaries are cheap and should ship early:** They protect against regressions during the refactoring process itself. Add them in Phase 1 before any structural changes.

---

## MVP Definition

### Launch With (Refactoring v1 — Feature Parity)

Minimum viable refactoring: the app works identically but is no longer a monolith.

- [ ] BloggerMasterApp.jsx split into feature-based components — the monolith is gone
- [ ] Custom hooks per domain (useSchedules, useTemplates, useProfile, useGoogleCalendar, useWeather) — state is segmented
- [ ] All localStorage data migrated to Supabase DB with RLS — cloud sync works
- [ ] Safe JSON.parse / validation on all data loads — no crash-on-corrupted-data
- [ ] Error boundaries in place — no blank screen on component errors
- [ ] Silent error catches replaced with user-facing toasts — failures are visible
- [ ] Google Calendar tokens moved out of localStorage — security baseline met

### Add After Validation (v1.x)

Once the split is stable and in production:

- [ ] TanStack Query adoption — when manual fetch/state management proves tedious
- [ ] Google Calendar pre-call token expiry check — when users report calendar sync failures
- [ ] Admin roles via Supabase user_roles table — when adding/removing admins requires deploy
- [ ] Utility layer extraction — when duplication is confirmed across multiple feature hooks

### Future Consideration (v2+)

After the structure milestone is complete and a UI milestone begins:

- [ ] TypeScript migration — requires stable structure to migrate incrementally
- [ ] Full test suite — E2E for auth flows, unit tests for hooks and services
- [ ] List virtualization — only if profiling shows it's needed at actual user scale
- [ ] i18n — only if multi-language becomes a product requirement

---

## Feature Prioritization Matrix

| Feature | Dev Value | Implementation Cost | Priority |
|---------|-----------|---------------------|----------|
| Component splitting | HIGH | HIGH | P1 |
| Custom hooks per domain | HIGH | HIGH | P1 |
| Supabase DB tables + migration | HIGH | HIGH | P1 |
| Data access layer (service functions) | HIGH | MEDIUM | P1 |
| Safe JSON.parse / validation | HIGH | LOW | P1 |
| Error boundaries | HIGH | LOW | P1 |
| Google Calendar token security | HIGH | MEDIUM | P1 |
| Silent error catch replacement | MEDIUM | MEDIUM | P1 |
| Feature-based folder structure | HIGH | LOW | P1 (done as part of splitting) |
| Constants extraction | MEDIUM | LOW | P2 |
| TanStack Query adoption | HIGH | MEDIUM | P2 |
| useCallback/useMemo memoization | MEDIUM | LOW | P2 |
| Selective data refresh | MEDIUM | LOW | P2 (depends on TanStack Query) |
| Google Calendar token expiry check | MEDIUM | MEDIUM | P2 |
| Admin roles via Supabase | LOW | LOW | P2 |
| Utility layer | LOW | LOW | P2 |
| TypeScript migration | HIGH | HIGH | P3 |
| Test suite | HIGH | HIGH | P3 |
| List virtualization | LOW | MEDIUM | P3 |
| i18n | LOW | HIGH | P3 |

**Priority key:**
- P1: Required for refactoring milestone to be complete
- P2: Included if capacity allows; strong improvements but not blocking
- P3: Separate milestone; do not mix into this refactoring

---

## Refactoring Execution Patterns

### Pattern: Feature-by-Feature Extraction (Recommended)

Extract one feature at a time, leaving BloggerMasterApp as the shell until the last feature is extracted.

```
Phase N: Extract [feature]
  1. Create src/features/[feature]/ folder
  2. Write service functions (Supabase queries)
  3. Write custom hook (owns state + calls services)
  4. Move JSX to feature component
  5. Replace BloggerMasterApp JSX block with <FeatureComponent />
  6. Verify: tab still works identically
  7. Remove dead state variables from BloggerMasterApp
```

This is safer than a big-bang split. BloggerMasterApp shrinks by ~400-600 lines per feature extracted.

### Pattern: Data Migration Strategy

Run localStorage and Supabase in parallel during transition, then cut over.

```
During migration:
  1. On app load: check Supabase for data first
  2. If Supabase empty and localStorage has data: migrate localStorage → Supabase
  3. Write all changes to Supabase only (drop localStorage writes)
  4. After full migration: remove localStorage reads
```

This avoids a hard cut-over and gives a recovery path if Supabase writes fail.

### Anti-Pattern: Global Rewrite in One PR

Splitting all 4,243 lines in one PR creates an unreviable diff. Any regression is unlocatable. Extract feature-by-feature and merge each feature split independently.

---

## Sources

- Existing codebase analysis: `/Users/dimi/Desktop/바이브코딩/blog-app/.planning/codebase/CONCERNS.md` (HIGH confidence — first-party)
- Existing codebase analysis: `/Users/dimi/Desktop/바이브코딩/blog-app/.planning/codebase/ARCHITECTURE.md` (HIGH confidence — first-party)
- React monolithic component refactoring: https://dev.to/aze3ma/breaking-up-with-our-monolithic-table-a-react-refactoring-journey-6k2 (MEDIUM)
- React Design Patterns 2025: https://www.telerik.com/blogs/react-design-patterns-best-practices (MEDIUM)
- React state management 2025 — custom hooks vs libraries: https://www.developerway.com/posts/react-state-management-2025 (MEDIUM)
- State management trends 2025 (Zustand, Jotai, XState): https://makersden.io/blog/react-state-management-in-2025 (MEDIUM)
- TanStack Query + Supabase integration (Jan 2026): https://makerkit.dev/blog/saas/supabase-react-query (HIGH — recent, official-adjacent)
- Supabase Services + Hook architecture: https://javascript.plainenglish.io/the-supabase-services-hooks-guide-that-will-transform-your-data-layer-architecture-301b79a8c411 (MEDIUM)
- Feature-based folder structure, React 2025: https://www.robinwieruch.de/react-folder-structure/ (MEDIUM)
- React refactoring anti-patterns: https://alexkondov.com/refactoring-a-messy-react-component/ (MEDIUM)
- React anti-patterns reference: https://itnext.io/6-common-react-anti-patterns-that-are-hurting-your-code-quality-904b9c32e933 (MEDIUM)

---

*Feature research for: React monolith-to-modular refactoring + localStorage-to-Supabase migration*
*Researched: 2026-04-06*
