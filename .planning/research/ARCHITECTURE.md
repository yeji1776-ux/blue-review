# Architecture Research

**Domain:** React SPA — blogger management tool (schedules, templates, Google Calendar, Supabase)
**Researched:** 2026-04-06
**Confidence:** HIGH (based on direct codebase analysis + established React 19 patterns)

---

## Current State: The Monolith Problem

`BloggerMasterApp.jsx` (4,243 lines) contains everything:

- 50+ `useState` declarations in a single component scope
- All business logic (weather fetch, Google Calendar sync, image export, AI parsing)
- All UI screens (home, schedule manage, calendar, tools, profile) rendered via `activeTab` conditionals
- All data persistence (localStorage reads in useState initializers, Supabase upsert on debounce)
- Sub-components defined as functions inside the file (`SortableTemplateItem`, `BiometricLockScreen`,
  `PasswordResetScreen`, `AdminSubscriptionControl`)

**Consequence:** Any state change anywhere triggers reconciliation across the entire 4,243-line render
function. `profiles`, `schedules`, `templates`, `hashtags`, `gcalToken`, `weather`, `fontSize`,
`themeColor`, and 40+ UI flags are all siblings in the same component.

---

## Identified Feature Domains

Analysis of the `// ---` comment sections and state declarations reveals 9 discrete domains:

| Domain | State Variables | Data Source | External Calls |
|--------|----------------|-------------|----------------|
| Auth | `user`, `isGuest`, `authError`, `biometricLocked`, `biometricEnabled`, `biometricSupported` | Supabase Auth | WebAuthn API |
| Profile | `profile`, `profileSaved`, `profileSubTab`, `newPassword`, `confirmPassword`, `passwordMsg` | localStorage → Supabase `user_data` | none |
| Schedules | `schedules`, `selectedScheduleId`, `editingScheduleId`, `parsedData`, `rawText`, `isParsing`, `confirmDoneId`, `confirmVisitDate`, `confirmDeleteId`, `notePopupId`, `showTemplatePickerId`, `confirmDoneId`, `manageOngoingOpen`, `manageDoneOpen` | localStorage → Supabase `user_data` | Google Calendar API |
| Templates (sponsorship) | `templates`, `editingTemplateId`, `confirmDeleteTemplateId` | localStorage → Supabase `user_data` | none |
| Templates (FTC) | `ftcTemplates`, `editingFtcTemplateId` | localStorage → Supabase `user_data` | none |
| Hashtags | `hashtags`, `editingHashtagCat`, `newHashtag`, `newCatName`, `showAddCat`, `renamingCat`, `renameCatValue` | localStorage → Supabase `user_data` | none |
| Calendar view | `calendarMonth`, `selectedDate`, `platformFilter` | derived from `schedules` | none |
| Google Calendar | `gcalToken`, `gcalConnecting`, `gcalCalendars`, `gcalSelectedCal` | localStorage | Google OAuth + Calendar API |
| UI/Preferences | `activeTab`, `fontSize`, `themeColor`, `showSettings`, `toolSubTab`, `locationPopup`, `homeSchedulesOpen`, `homeQuickCopyOpen`, `homeTemplatesOpen`, `homeFtcOpen`, `collapsedBrands`, `expandedBrands`, `detailSections` | localStorage | none |
| Subscription/Admin | `userPlan`, `planExpiresAt`, `isAdmin`, `showUpgradeModal`, `upgradeReason`, `adminUsers`, `adminLoading` | Supabase `user_data` | Supabase RPC |
| Saved Texts / Tools | `savedTexts`, `textToCount`, `editingTextId`, `showSaveTextToast`, `showSavedTexts`, `rawText`, `isParsing` | localStorage → Supabase `user_data` | none |
| Weather | `weather`, `locationPopup` | wttr.in API + Nominatim API | Geolocation API |
| Image Export | (uses refs: `cardRefs`, `imageCardRefs`) | DOM refs | modern-screenshot / domToPng |

---

## Recommended Target Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Route / Shell Layer                           │
│  App.jsx → BloggerShell (auth gate, nav bar, tab router)            │
├─────────────────────────────────────────────────────────────────────┤
│                        Screen / Page Layer                           │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ HomeScreen│  │ScheduleScreen│  │CalendarSc│  │  ToolsScreen │   │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └──────┬───────┘   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    ProfileScreen                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                     Feature Hook Layer                               │
│  useSchedules  useTemplates  useHashtags  useGoogleCalendar         │
│  useProfile    useSavedTexts  useSubscription  useWeather           │
├─────────────────────────────────────────────────────────────────────┤
│                     Service / Repository Layer                       │
│  scheduleService  templateService  profileService  supabaseClient   │
│  googleCalendarService  imageExportService                           │
├─────────────────────────────────────────────────────────────────────┤
│                     External Services                                │
│  Supabase DB   Google Calendar API   wttr.in   WebAuthn   Vercel   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `App.jsx` | Root mount, auth gate decision | `useAuth`, `BloggerShell`, `LoginPage`, `BiometricLockScreen`, `PasswordResetScreen` |
| `BloggerShell` | Nav bar, tab state, global layout frame | All screen components, `usePreferences` |
| `HomeScreen` | Dashboard — weather card, quick-copy, schedule summary, template shortcuts | `useWeather`, `useSchedules`, `useTemplates` |
| `ScheduleScreen` | CRUD schedules, drag-sort, detail modal, AI parser | `useSchedules`, `useGoogleCalendar`, `useTemplates` |
| `CalendarScreen` | Monthly calendar view, date filter, schedule dots | `useSchedules` (read-only derived data) |
| `ToolsScreen` | Character counter, saved texts, hashtag manager | `useSavedTexts`, `useHashtags` |
| `ProfileScreen` | Profile fields, platform toggles, password change, security, subscription, admin panel | `useProfile`, `useAuth`, `useSubscription`, `useGoogleCalendar` |
| `BiometricLockScreen` | Standalone full-screen lock (already extracted) | `useAuth` |
| `PasswordResetScreen` | Standalone full-screen password reset (already extracted) | `useAuth` |
| `LoginPage` | Auth forms — email/password, OAuth, OTP (already extracted) | `useAuth` |

---

## Recommended Project Structure

```
src/
├── main.jsx                         # React root entry (unchanged)
├── App.jsx                          # Auth gate + shell render
├── index.css                        # Global Tailwind + custom CSS
│
├── lib/                             # Singletons and pure utilities
│   ├── supabase.js                  # Supabase client (already exists)
│   ├── dateUtils.js                 # parseDeadlineToDate, getDday, parseExperiencePeriod
│   ├── brandUtils.js                # getBrandBadge, getDdayLabel, color maps
│   └── imageExport.js               # saveCardAsImage (wraps modern-screenshot)
│
├── services/                        # Data access — Supabase reads/writes, API calls
│   ├── userDataService.js           # load/save user_data row (schedules, templates, etc.)
│   ├── subscriptionService.js       # get_all_users_admin RPC, set_user_subscription RPC
│   ├── googleCalendarService.js     # syncToGoogleCalendar, deleteFromGoogleCalendar, fetchCalendars
│   └── weatherService.js            # fetchWeather, requestLocation (wraps wttr.in + Nominatim)
│
├── hooks/                           # Custom hooks — domain state + business logic
│   ├── useAuth.js                   # Already exists — keep as-is
│   ├── useProfile.js                # profile state, saveProfile, updateProfile
│   ├── useSchedules.js              # schedules CRUD, drag-sort, AI parser, image refs
│   ├── useTemplates.js              # sponsorship templates CRUD + FTC templates CRUD
│   ├── useHashtags.js               # hashtag categories CRUD
│   ├── useSavedTexts.js             # saved texts CRUD + character counter state
│   ├── useGoogleCalendar.js         # gcalToken lifecycle, connect/disconnect, sync
│   ├── useWeather.js                # weather fetch, location permission flow
│   ├── useSubscription.js           # userPlan, planExpiresAt, isAdmin, adminUsers
│   └── usePreferences.js            # fontSize, themeColor, activeTab, UI collapse flags
│
├── components/                      # Shared UI primitives (no business logic)
│   ├── LoginPage.jsx                # Already exists — keep as-is
│   ├── SortableItem.jsx             # Generic @dnd-kit sortable wrapper
│   ├── ConfirmModal.jsx             # Generic destructive action confirmation dialog
│   ├── UpgradeModal.jsx             # Plan upgrade prompt
│   └── ui/                          # Low-level atoms
│       ├── Toast.jsx
│       ├── Badge.jsx
│       └── DdayBadge.jsx
│
└── screens/                         # Full-page views (consume hooks, render UI)
    ├── HomeScreen.jsx               # activeTab === 'home'
    ├── ScheduleScreen.jsx           # activeTab === 'scheduleManage'
    │   ├── ScheduleCard.jsx
    │   ├── ScheduleDetailModal.jsx
    │   ├── ScheduleForm.jsx
    │   └── AiParserPanel.jsx
    ├── CalendarScreen.jsx           # activeTab === 'calendar'
    ├── ToolsScreen.jsx              # activeTab === 'tool'
    │   ├── CharacterCounter.jsx
    │   ├── SavedTexts.jsx
    │   └── HashtagManager.jsx
    ├── ProfileScreen.jsx            # activeTab === 'profile'
    │   ├── PlatformSettings.jsx
    │   ├── SecuritySettings.jsx
    │   ├── AppearanceSettings.jsx
    │   └── AdminPanel.jsx
    ├── BiometricLockScreen.jsx      # (move out of BloggerMasterApp.jsx)
    └── PasswordResetScreen.jsx      # (move out of BloggerMasterApp.jsx)
```

### Structure Rationale

- **`lib/`:** Pure functions with no React or Supabase dependency. Easiest to extract and test. `dateUtils.js` alone covers ~6 functions currently inlined in the monolith.
- **`services/`:** All I/O (Supabase queries, Google API calls, weather API). No React state — just async functions that return data. Hooks consume services; components never call services directly.
- **`hooks/`:** All `useState`, `useEffect`, `useCallback` for a domain. Hooks call services. Each hook is self-contained and independently testable.
- **`screens/`:** Only JSX + wiring. Screens call hooks, pass data as props to child components. Screens never call services directly.
- **`components/`:** Stateless or locally-stateful UI pieces. No calls to Supabase. Props-in, events-out.

---

## Architectural Patterns

### Pattern 1: Domain Hook with Service Dependency

**What:** Each feature domain has one hook that owns state + calls a service for persistence.

**When to use:** Any domain that reads/writes data (schedules, templates, profile, hashtags, saved texts).

**Trade-offs:** Slightly more files than inlining, but each domain is independently replaceable. If Supabase is swapped for a different backend, only the service layer changes.

**Example:**
```javascript
// src/hooks/useSchedules.js
import { useState, useEffect, useRef } from 'react';
import { userDataService } from '../services/userDataService';
import { googleCalendarService } from '../services/googleCalendarService';

export function useSchedules({ user, isGuest, gcalToken }) {
  const [schedules, setSchedules] = useState([]);
  const dbLoaded = useRef(false);

  // Load from Supabase on login
  useEffect(() => {
    if (!user || isGuest) return;
    userDataService.load(user.id).then(data => {
      if (data?.schedules?.length) setSchedules(data.schedules);
      dbLoaded.current = true;
    });
  }, [user?.id]);

  // Debounce save to Supabase
  useEffect(() => {
    if (!user || isGuest || !dbLoaded.current) return;
    const timer = setTimeout(() => {
      userDataService.save(user.id, { schedules });
    }, 1500);
    return () => clearTimeout(timer);
  }, [schedules]);

  const addSchedule = (schedule) => setSchedules(prev => [...prev, schedule]);
  const updateSchedule = (id, patch) => setSchedules(prev =>
    prev.map(s => s.id === id ? { ...s, ...patch } : s)
  );
  const deleteSchedule = async (id) => {
    const target = schedules.find(s => s.id === id);
    if (target?.gcalEventId && gcalToken) {
      await googleCalendarService.deleteEvent(target.gcalEventId, gcalToken);
    }
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  return { schedules, addSchedule, updateSchedule, deleteSchedule };
}
```

### Pattern 2: Screen as Pure Wiring

**What:** Screen components only destructure hooks and compose child components. No business logic.

**When to use:** Every tab screen (`HomeScreen`, `ScheduleScreen`, etc.).

**Trade-offs:** More files, but individual screens become easy to read and reason about.

**Example:**
```javascript
// src/screens/ScheduleScreen.jsx
export function ScheduleScreen({ user, isGuest }) {
  const { schedules, addSchedule, updateSchedule, deleteSchedule } = useSchedules({ user, isGuest });
  const { gcalToken, syncToCalendar } = useGoogleCalendar();
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div>
      {schedules.map(s => (
        <ScheduleCard key={s.id} schedule={s} onSelect={setSelectedId} onDelete={deleteSchedule} />
      ))}
      {selectedId && (
        <ScheduleDetailModal
          schedule={schedules.find(s => s.id === selectedId)}
          onClose={() => setSelectedId(null)}
          onUpdate={updateSchedule}
          onSync={syncToCalendar}
          gcalConnected={!!gcalToken}
        />
      )}
    </div>
  );
}
```

### Pattern 3: Merged Supabase Upsert (Single Row per User)

**What:** All user data (schedules, templates, profile, hashtags, saved texts) stored in a single
`user_data` row keyed by `user_id`. One upsert covers all domains.

**When to use:** This is the existing Supabase structure — keep it. The current partial implementation
in `BloggerMasterApp.jsx` (lines 885–898) is already correct. Extracting to `userDataService.js` makes
it reusable across hooks.

**Trade-offs:** Simple to implement; not suitable if individual domains need row-level security or
audit trails. For this app's size, a single row is correct.

```javascript
// src/services/userDataService.js
import { supabase } from '../lib/supabase';

export const userDataService = {
  async load(userId) {
    const { data } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  },
  async save(userId, patch) {
    await supabase.from('user_data').upsert(
      { user_id: userId, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  },
};
```

### Pattern 4: Preference State in `usePreferences` (No Supabase)

**What:** UI-only state (font size, theme color, collapse flags) stays in `localStorage` only — never
synced to Supabase. A dedicated hook owns this state so it doesn't pollute domain hooks.

**When to use:** Any state that is device-specific, not user-data.

**Trade-offs:** Device preferences don't roam across devices — this is acceptable for display settings.

---

## Data Flow

### Authentication Gate Flow

```
App.jsx
  ↓ useAuth()
  ├─ loading=true → null (nothing rendered)
  ├─ isRecovery=true → PasswordResetScreen
  ├─ user=null → LoginPage
  ├─ biometricLocked=true → BiometricLockScreen
  └─ user present, unlocked → BloggerShell
```

### User Data Load Flow (Post-login)

```
useAuth → user.id available
  ↓
useSchedules, useTemplates, useProfile, useHashtags, useSavedTexts, useSubscription
  each call userDataService.load(user.id) independently (or one shared loader in BloggerShell)
  ↓
Supabase user_data row fetched
  ↓
setState in each hook with relevant slice of data
  ↓
Screen components re-render with loaded data
```

**Recommendation:** Use a single `useUserData` loader at the shell level that fetches once and passes
slices down, OR let each hook load independently (simpler, slightly redundant network). The single
fetch approach avoids N parallel Supabase calls but requires coordination. Given the app's current
pattern of one upsert per save, a single `useUserData` hook at shell level with selectors is cleaner.

### Write / Save Flow

```
User action in Screen component
  ↓
Event handler calls hook mutation (e.g., updateSchedule(id, patch))
  ↓
Hook setState → immediate UI update
  ↓
useEffect with debounce timer (1500ms) fires
  ↓
userDataService.save(userId, { schedules }) → Supabase upsert
  ↓
localStorage.setItem for offline fallback (optional — can remove after full Supabase migration)
```

### Google Calendar Sync Flow

```
User saves/edits schedule → updateSchedule() in useSchedules
  ↓
If gcalToken present: googleCalendarService.syncEvent(schedule, token)
  ↓
Google Calendar API PUT/POST → returns eventId
  ↓
updateSchedule(id, { gcalEventId: eventId }) → persisted to Supabase
```

### State Management

```
┌────────────────────────────────────────────────────────────────┐
│  App-level (BloggerShell):                                      │
│    activeTab, biometricLocked → BloggerShell state             │
├────────────────────────────────────────────────────────────────┤
│  Domain hooks (consumed by screens):                            │
│    useSchedules  → schedules, CRUD ops                         │
│    useTemplates  → templates + ftcTemplates, CRUD ops          │
│    useProfile    → profile fields, saveProfile                 │
│    useHashtags   → hashtag categories, CRUD ops                │
│    useSavedTexts → savedTexts, CRUD ops                        │
│    useGoogleCalendar → gcalToken lifecycle, sync/delete        │
│    useWeather    → weather data, location permission           │
│    useSubscription → plan, admin state, RPC calls             │
│    usePreferences → fontSize, themeColor, UI flags             │
├────────────────────────────────────────────────────────────────┤
│  No global store (Context/Redux/Zustand not needed at          │
│  this app's scale — prop drilling 1-2 levels is fine)         │
└────────────────────────────────────────────────────────────────┘
```

---

## Build Order (Phase Dependency Graph)

The refactoring must follow this order — later steps depend on earlier ones:

```
Step 1: Utilities and Services (no React, no state)
  lib/dateUtils.js
  lib/brandUtils.js
  lib/imageExport.js
  services/userDataService.js
  services/googleCalendarService.js
  services/weatherService.js
  services/subscriptionService.js
  ↓
Step 2: Domain Hooks (depend on services, no UI)
  usePreferences.js
  useWeather.js
  useProfile.js
  useTemplates.js   (sponsorship + FTC — often used together)
  useHashtags.js
  useSavedTexts.js
  useGoogleCalendar.js
  useSubscription.js
  useSchedules.js   (depends on useGoogleCalendar for delete sync)
  ↓
Step 3: Shared UI Components (no hooks, pure props)
  components/SortableItem.jsx
  components/ConfirmModal.jsx
  components/UpgradeModal.jsx
  components/ui/Toast.jsx, Badge.jsx, DdayBadge.jsx
  ↓
Step 4: Screens (consume hooks, compose components)
  screens/PasswordResetScreen.jsx  (already mostly extracted)
  screens/BiometricLockScreen.jsx  (already mostly extracted)
  screens/ToolsScreen.jsx          (simplest — fewest dependencies)
  screens/CalendarScreen.jsx       (read-only derived from schedules)
  screens/HomeScreen.jsx
  screens/ProfileScreen.jsx
  screens/ScheduleScreen.jsx       (most complex — last)
  ↓
Step 5: Shell + Supabase Migration Cutover
  BloggerShell.jsx                 (replace BloggerMasterApp.jsx)
  App.jsx update (auth gate)
  Remove localStorage fallbacks after Supabase is confirmed working
```

**Rationale for ordering:**
- Services before hooks: hooks import services, not the reverse
- Hooks before screens: screens consume hooks as the single source of truth
- Simpler screens before complex: Tools and Calendar have the fewest cross-domain dependencies;
  ScheduleScreen is last because it coordinates schedules + gcal + templates + image export
- Shell last: shell is the composition root — build all pieces first, then wire them

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (1 user table, localStorage) | Proposed architecture above is sufficient |
| 1k–10k users | Supabase upsert on single `user_data` row scales fine; add Supabase Realtime if multi-device sync needed |
| 10k+ users | Split `user_data` into separate tables (schedules, templates); add row-level security per table; consider Supabase Edge Functions for heavier operations |

**First bottleneck:** Google Calendar OAuth tokens stored in localStorage (security risk). Migrating
to Supabase-stored tokens (encrypted) is the most important scaling/security improvement, but is
out-of-scope for this milestone unless done as part of the `useGoogleCalendar` hook extraction.

**Second bottleneck:** The debounced upsert (current: 1.5s, full `user_data` row every change) sends
entire blob including all schedules and templates on every keystroke in any field. After migration,
scope saves to the changed domain only by calling `userDataService.save` with only the changed field:
```javascript
await supabase.from('user_data').update({ templates }).eq('user_id', userId);
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Recreating the Monolith Inside a Screen

**What people do:** Move all 4,243 lines into `ScheduleScreen.jsx` and call it "refactored."

**Why it's wrong:** Exact same problem, different filename. Every schedule interaction still triggers
re-render of template and hashtag state.

**Do this instead:** Each screen file should have at most ~200-300 lines of JSX. Business logic lives
in hooks. Sub-components live in dedicated files inside the screen subdirectory.

### Anti-Pattern 2: Prop Drilling Through More Than Two Levels

**What people do:** Pass `schedules`, `setSchedules`, `gcalToken`, `syncToCalendar`, `templates` as
props through `HomeScreen → ScheduleList → ScheduleCard → ScheduleDetailModal`.

**Why it's wrong:** Screens become tightly coupled to the shape of parent data. Adding a field means
threading props through multiple layers.

**Do this instead:** Call hooks directly in the screen that needs them. `ScheduleDetailModal` gets
its own `useGoogleCalendar()` call if it needs gcal state, or receives only the gcal-relevant data
(not the entire hook) as props.

### Anti-Pattern 3: Migrating localStorage to Supabase Without a Loading State

**What people do:** Remove localStorage initializer from `useState`, assume Supabase will provide
data before first render.

**Why it's wrong:** Supabase fetch is async. On first render, `schedules` is `[]`, triggering an
immediate upsert that wipes the user's data with an empty array before the load completes.

**Do this instead:** Use `dbLoaded` ref (already in current code at line 845) — do not trigger save
effects until `dbLoaded.current === true`. Or use a `isLoading` boolean gate in the hook.

### Anti-Pattern 4: Multiple Supabase Calls on Every State Change

**What people do:** Call `supabase.from('user_data').upsert(...)` inside every individual setter
(one call per `addSchedule`, one per `updateTemplate`, etc.).

**Why it's wrong:** 10 rapid edits = 10 concurrent Supabase calls. Race conditions possible.

**Do this instead:** Keep the existing debounce pattern (1500ms timer in useEffect that watches
`schedules`). One consolidated save per domain, not per mutation.

### Anti-Pattern 5: Defining Sub-components Inside Hook or Screen Files

**What people do:** Define `const ScheduleCard = () => { ... }` inside `ScheduleScreen.jsx`.

**Why it's wrong:** React recreates the function reference on every render → every parent state
change unmounts and remounts `ScheduleCard`, losing focus, animations, input state.

**Do this instead:** Always define components at module scope (top of their own file, or top of
the file if co-located). Never inside another component's render function.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `useAuth.js` hook (already extracted) | Keep as-is |
| Supabase DB | `userDataService.js` → `hooks/use*.js` | Single row upsert per user |
| Google Calendar API | `googleCalendarService.js` → `useGoogleCalendar.js` | Token stored in localStorage today; Supabase preferred long-term |
| wttr.in + Nominatim | `weatherService.js` → `useWeather.js` | Fire-and-forget; no persistence needed |
| WebAuthn | Inside `useAuth.js` (biometric methods already there) | `biometric_cred_id` stays in localStorage (device-specific) |
| Vercel Serverless (`api/`) | Called by `googleCalendarService.js` | No changes needed to `api/` files |
| modern-screenshot | `lib/imageExport.js` | Pure utility function, no state |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `BloggerShell` ↔ Screens | Props (user, isGuest) + hook calls inside screens | Screens do not share state with each other |
| Screens ↔ Hooks | Direct hook consumption | Hooks are not passed as props — always called at the screen level |
| Hooks ↔ Services | Direct async function calls | Services return plain data; hooks own all React state |
| Services ↔ Supabase | `supabase` client singleton from `lib/supabase.js` | One import, already established |

---

## Sources

- Direct codebase analysis: `src/BloggerMasterApp.jsx` (2026-04-06, lines 1–1400 reviewed)
- Current architecture doc: `.planning/codebase/ARCHITECTURE.md`
- React 19 hooks patterns: established community standard (hooks-as-domain-controllers)
- Supabase upsert pattern: current implementation at lines 885–898 of `BloggerMasterApp.jsx`
- Anti-pattern: component-inside-render (React reconciliation behavior, well-established)

---

*Architecture research for: React monolith decomposition — Blue Review blogger app*
*Researched: 2026-04-06*
