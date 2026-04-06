# Stack Research

**Domain:** React SPA refactoring — monolith decomposition + localStorage-to-Supabase migration
**Researched:** 2026-04-06
**Confidence:** HIGH (all versions verified via npm registry; library compatibility verified via peer dependencies)

---

## Context: What This Refactor Is

The app is React 19 + Vite + Tailwind CSS + Supabase — that stack is locked and not changing. This research answers only the **additive** question: what libraries should be added to support:

1. Breaking a 4,243-line monolith into feature modules
2. Replacing 50+ `useState` hooks with organized, segmented state
3. Migrating localStorage persistence to Supabase DB
4. Fixing silent errors, missing error boundaries, and security gaps

No framework migration. No UI changes. Additions only.

---

## Recommended Stack

### Core Technologies (locked — do not change)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| React | 19.2.4 | UI framework | Existing |
| Vite | 8.0.0 | Build tool | Existing |
| Tailwind CSS | 4.2.1 | Styling | Existing |
| @supabase/supabase-js | 2.99.1 | Auth + DB | Existing |

### New: State Management

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **zustand** | **5.0.12** | Global client state (schedules, templates, profile, UI flags) | Minimal boilerplate — single `create()` call per store, no actions/reducers/providers. React 19 compatible (peer dep: `react >= 18.0.0`). 3KB bundle. The 2025 community consensus for mid-size apps that aren't enterprise-scale. v5 enforces named exports and immutable updates, which are correct patterns. |

**Why not Redux Toolkit:** Overkill for a single-developer app migrating away from a monolith. Redux requires actions, reducers, slices, and a provider — that's complexity the project doesn't need and doesn't have yet. RTK is correct for large teams with strict discipline requirements.

**Why not Jotai:** Atom-based state is excellent for fine-grained UI interactivity (e.g., rich text editors, canvas). This app's state is feature-scoped (schedules, templates, profile) — a flat store model fits better than composing atoms.

**Why not React Context + useReducer:** Context re-renders all consumers on any state change. With 50+ state variables being split, Context would require careful splitting into many providers, which is exactly the complexity being escaped. Zustand's selector-based subscriptions avoid this.

### New: Server State / Data Fetching

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **@tanstack/react-query** | **5.96.2** | Supabase data fetching, caching, mutation, background sync | Eliminates manual `useEffect` + `useState` for every Supabase query. Provides: automatic stale-while-revalidate, deduplication, optimistic updates, background refetch, and `invalidateQueries` for post-mutation cache sync. Explicit React 19 peer dep (`^18 \|\| ^19`). |
| **@tanstack/react-query-devtools** | **5.96.2** | Query inspection in development | Same version as react-query, zero config — add to `main.jsx` in dev mode only. |

**Why React Query, not SWR:** TanStack Query v5 has broader mutation support, first-class `useMutation`, devtools, and the `invalidateQueries` API that maps directly to the Supabase mutation → cache sync pattern this app needs. SWR is excellent for simpler read-heavy cases without complex mutation workflows.

**Why React Query, not Supabase Realtime for everything:** Realtime subscriptions are stateful and expensive. For this app's use case (single user, personal data), React Query's refetch-on-focus and stale-time strategy is sufficient. Realtime should only be added for genuinely collaborative features added in a future milestone.

**Pattern for Supabase + React Query:**
```typescript
// useSchedules.ts
export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    staleTime: 60_000, // 1 minute
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (schedule) => supabase.from('schedules').insert(schedule).throwOnError(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });
}
```

### New: Runtime Validation

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **zod** | **4.3.6** | Schema validation for localStorage migration and Supabase row shapes | CONCERNS.md documents 9 unprotected `JSON.parse()` calls that crash on corrupted data, and missing field validation on schedule data. Zod v4 is 14x faster than v3, 57% smaller core. Use `z.safeParse()` on all localStorage reads during migration to catch and discard corrupted data gracefully. Also validates Supabase response shapes before use. |

**Why Zod, not Yup:** Zod v4 is TypeScript-native with superior type inference. Yup's TypeScript support is bolted-on. The project CONCERNS.md flags missing TypeScript as a medium-priority item — Zod schemas become the bridge if/when TS is added.

### New: Error Boundaries

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **react-error-boundary** | **6.1.1** | Declarative error boundaries for feature modules | CONCERNS.md explicitly flags missing error boundaries as a high-priority issue. `react-error-boundary` wraps the hook-unfriendly class component API into a clean declarative interface. Supports `fallbackRender`, `onError` logging, and `resetKeys` for recovery. React 19 compatible (peer dep: `^18.0.0 \|\| ^19.0.0`). |

**Why not writing your own:** React Error Boundaries must be class components — there's no hooks-based alternative in React core. `react-error-boundary` is the de facto standard wrapper by Brian Vaughn (ex-React core team). 6.1.1 adds React 19 support explicitly.

---

## Supporting Libraries (already installed — use correctly)

These exist in `package.json` and should be used, not replaced:

| Library | Current Version | Correct Usage in Refactor |
|---------|----------------|--------------------------|
| @dnd-kit/core | 6.3.1 | Keep for schedule + template drag-and-drop. Wrap sortable items in `React.memo` after extraction. |
| lucide-react | 0.577.0 | Keep. Already optimal for tree-shaking. |
| html2canvas + modern-screenshot | 1.4.1 / 4.6.8 | Keep both. Isolate into `useImageExport` custom hook. |

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| React Compiler (built into React 19) | Auto-memoization of components and values | Enabled by default in React 19. Eliminates manual `useCallback`/`useMemo` in most cases. Verify with React DevTools "Memo" badge. |
| @tanstack/react-query-devtools | Visual query inspection | Add conditionally: `{import.meta.env.DEV && <ReactQueryDevtools />}` |
| ESLint (existing) | Code quality | Add `eslint-plugin-query` from TanStack for React Query lint rules |

---

## Installation

```bash
# State management
npm install zustand@5.0.12

# Server state / data fetching
npm install @tanstack/react-query@5.96.2
npm install -D @tanstack/react-query-devtools@5.96.2

# Runtime validation
npm install zod@4.3.6

# Error boundaries
npm install react-error-boundary@6.1.1
```

**Note on peer deps:** The project uses `legacy-peer-deps=true` in `.npmrc`. All four libraries have explicit React 19 support in their peer dependencies (`react >= 18.0.0` or `^18 || ^19`), so no conflicts expected.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Zustand 5 | Redux Toolkit | Enterprise teams with 5+ developers, strict action traceability requirements, or existing Redux investment |
| Zustand 5 | Jotai | Apps with granular atom-level reactivity needs (rich text editors, collaborative canvas, spreadsheet UIs) |
| TanStack Query v5 | SWR | Simpler read-heavy apps with no complex mutation workflows and no devtools requirement |
| TanStack Query v5 | Supabase Realtime everywhere | Multi-user collaborative features where multiple users edit the same data simultaneously |
| Zod v4 | Yup | Existing Yup investment; non-TypeScript projects where Zod's TS inference is not needed |
| react-error-boundary | Custom class component | If you need deep integration with a custom error reporting service that requires extending the class |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Redux Toolkit** (new addition) | Adds actions/slices/reducers/provider boilerplate to a solo app with no existing Redux. The complexity budget should go to actual refactoring, not RTK patterns. | Zustand 5 |
| **MobX** | Observable-based reactivity is a paradigm shift that requires learning. The existing team (solo dev) doesn't benefit from MobX's automatic tracking vs explicit Zustand selectors. | Zustand 5 |
| **React Context for global state** | Context re-renders all consumers on any state update. Splitting 50+ state variables into context would require 10+ providers or cause widespread re-render performance regressions. | Zustand with per-store selectors |
| **useEffect for data fetching** (new patterns) | All new Supabase data fetching must go through React Query. Writing `useEffect(() => { fetch... }, [])` bypasses caching, deduplication, and devtools. | `useQuery` + `useMutation` |
| **SWR** | React Query is already being adopted; mixing two data-fetching libraries creates confusion about which cache is authoritative. | TanStack Query v5 |
| **localStorage for new state** | The migration goal is specifically to move all persistence out of localStorage into Supabase. Any new state should go to Supabase first via React Query. | Supabase + React Query |
| **Zod v3** | v4 is the current stable release with 14x performance improvement and a cleaner API. `z.email()`, `z.url()` are now top-level. Import from `'zod'` for v4. | Zod 4.x |

---

## Component Organization Pattern

The feature-based folder structure is the 2025 consensus for this scale of refactor:

```
src/
  features/
    schedule/
      components/       # ScheduleCard.jsx, ScheduleList.jsx
      hooks/            # useSchedules.ts, useScheduleSort.ts
      types.ts          # Zod schema + inferred TS types
      index.ts          # Public API — only exports what other features need
    template/
      components/
      hooks/
      types.ts
      index.ts
    profile/
      components/
      hooks/
      types.ts
      index.ts
    calendar/           # Google Calendar integration
      components/
      hooks/
      index.ts
    auth/               # Existing useAuth.js + LoginPage.jsx
      components/
      hooks/
      index.ts
  shared/
    components/         # ErrorBoundary wrapper, Toast, Modal
    hooks/              # useWeather.ts, useImageExport.ts
    lib/                # supabase.js, errorTranslate.js
    constants.ts        # Plan limits, tab names, admin emails → DB
    utils/              # Date formatting, data serialization
  stores/               # Zustand stores (one per domain)
    scheduleStore.ts
    templateStore.ts
    profileStore.ts
    uiStore.ts          # Navigation tab, modal state, loading flags
```

**Rule for store vs query:** Zustand owns **UI state** (current tab, modal open, biometric unlock status). React Query owns **server-synced state** (schedules, templates, profile data from Supabase). Never duplicate data between them — React Query is the authoritative source for Supabase data.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| zustand@5.0.12 | react@>=18.0.0 | Verified via npm peerDependencies |
| @tanstack/react-query@5.96.2 | react@^18 \|\| ^19 | Explicit React 19 support in peerDependencies |
| react-error-boundary@6.1.1 | react@^18.0.0 \|\| ^19.0.0 | Explicit React 19 support |
| zod@4.3.6 | No React peer dep | Framework-agnostic; no compatibility concerns |
| All four libraries | Each other | No known conflicts; verified independent install |

---

## Migration Order Recommendation

The state management library choices directly determine what gets refactored in what order:

1. **Install all four libraries first** (no code changes, no risk)
2. **Add `QueryClientProvider` + error boundaries to `App.jsx`** (one file, low risk)
3. **Extract Zustand stores** from the monolith's state variables (no UI changes)
4. **Migrate one feature's Supabase reads to React Query** (schedules first — highest value)
5. **Add Zod validation** to all `JSON.parse()` calls during localStorage reads
6. **Delete localStorage writes** for migrated features only after Supabase reads confirmed working

This order is reversible at each step — if a step breaks production, revert that step without touching the others.

---

## Sources

- `npm show zustand version` + `npm show zustand peerDependencies` — versions 5.0.12, React >= 18.0.0 [HIGH confidence]
- `npm show @tanstack/react-query version` + peerDependencies — version 5.96.2, react `^18 || ^19` [HIGH confidence]
- `npm show react-error-boundary version` + peerDependencies — version 6.1.1, react `^18.0.0 || ^19.0.0` [HIGH confidence]
- `npm show zod version` — version 4.3.6 [HIGH confidence]
- [State Management in 2025: When to Use Context, Redux, Zustand, or Jotai](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k) — ecosystem positioning [MEDIUM confidence]
- [How to Use Supabase with TanStack Query (React Query v5)](https://makerkit.dev/blog/saas/supabase-react-query) — Supabase + React Query integration patterns [MEDIUM confidence]
- [Zod v4 Available with Major Performance Improvements](https://www.infoq.com/news/2025/08/zod-v4-available/) — v4 changelog verification [MEDIUM confidence]
- [React v19 – React official blog](https://react.dev/blog/2024/12/05/react-19) — React Compiler auto-memoization [HIGH confidence]
- [Mastering State Management: Zustand v5 and Modern React Patterns](https://react-news.com/mastering-state-management-a-deep-dive-into-zustand-v5-and-modern-react-patterns) — v5 specifics [MEDIUM confidence]
- [Zustand vs Redux Toolkit vs Jotai – Better Stack](https://betterstack.com/community/guides/scaling-nodejs/zustand-vs-redux-toolkit-vs-jotai/) — comparative analysis [MEDIUM confidence]

---

*Stack research for: React 19 monolith refactoring — Blue Review blogger app*
*Researched: 2026-04-06*
