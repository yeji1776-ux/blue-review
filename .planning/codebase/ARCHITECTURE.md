# Architecture

**Analysis Date:** 2026-04-06

## Pattern Overview

**Overall:** Monolithic Single-Page Application with Client-Side State Management

**Key Characteristics:**
- React 19 component-driven UI with local state (useState, useRef)
- Authentication handled via Supabase Auth (email/password, OAuth, biometric)
- Data persisted to browser localStorage for schedules, profiles, templates
- Server-side endpoints for sensitive OAuth operations (Google Calendar token exchange)
- Client-side rendering with Tailwind CSS styling
- Drag-and-drop UI elements using @dnd-kit library

## Layers

**Presentation Layer:**
- Purpose: Render UI components and handle user interactions
- Location: `src/BloggerMasterApp.jsx`, `src/components/LoginPage.jsx`
- Contains: React components, event handlers, form state
- Depends on: Hooks (useAuth), Libraries (lucide-react, @dnd-kit)
- Used by: Direct browser rendering via `src/main.jsx`

**Authentication Layer:**
- Purpose: Manage user sessions, credential verification, password recovery
- Location: `src/hooks/useAuth.js`, `src/lib/supabase.js`
- Contains: Custom React hook for auth state, Supabase client initialization
- Depends on: @supabase/supabase-js SDK
- Used by: BloggerMasterApp component for login/signup/logout flows

**API Integration Layer:**
- Purpose: Server-side OAuth token handling and calendar integration
- Location: `api/gcal-token.js`, `api/gcal-refresh.js`, `api/gcal-callback.js`
- Contains: Serverless functions (Vercel) for Google Calendar OAuth
- Depends on: Google OAuth2 API, environment variables
- Used by: Client-side code that needs to exchange/refresh Google tokens

**State Management Layer:**
- Purpose: Maintain application state (profiles, schedules, preferences)
- Location: Inside `src/BloggerMasterApp.jsx` via useState hooks
- Contains: Local state for user preferences, schedules, templates, authentication status
- Depends on: localStorage for persistence
- Used by: All UI components within the app

**External Service Integration:**
- Purpose: Connect to third-party APIs for data
- Includes: 
  - Supabase Auth (email, password, OAuth providers)
  - Google Calendar API (events, tokens)
  - OpenWeatherMap API (wttr.in service for weather data)
  - OpenStreetMap Nominatim (geolocation reverse lookup)
  - WebAuthn (biometric authentication)

## Data Flow

**Authentication Flow:**

1. User lands on app, `useAuth` hook checks for existing session via `supabase.auth.getSession()`
2. If session exists, user is authenticated; otherwise, LoginPage renders
3. User logs in via email/password → `signInWithEmail()` → Supabase Auth validates
4. On OAuth login → `signInWithProvider()` → Supabase handles provider redirect
5. After login, `supabase.auth.onAuthStateChange()` updates user state globally
6. If biometric is enabled and user is authenticated, BiometricLockScreen shows
7. After biometric unlock, main app (BloggerMasterApp) renders

**Schedule Management Flow:**

1. User navigates to "schedules" tab in BloggerMasterApp
2. Schedules load from localStorage (`blogger_profile`, `blogSchedules`)
3. User creates/edits schedule → updates local `schedules` state
4. On save, data is written back to localStorage
5. Changes trigger UI re-render via React
6. For Google Calendar: schedule is synced via Google Calendar API calls

**Template Management Flow:**

1. Templates (sponsorship request templates, FTC disclosure templates) stored in localStorage
2. User can add/edit/delete templates → updates `templates` or `ftcTemplates` state
3. On saving, serialized JSON written to localStorage
4. User can select template from dropdown → populates text fields

**State Management:**

- **Local Component State:** All state is React state (useState). No Redux, Zustand, or Context API
- **Persistence:** localStorage stores profiles, templates, schedules, user preferences
- **Session Storage:** sessionStorage stores temporary session flags (biometric unlock, location permission)
- **Authentication State:** Managed by Supabase SDK internally, read via `useAuth` hook
- **Real-time Updates:** No subscription system; changes are immediate via setState

## Key Abstractions

**useAuth Hook:**
- Purpose: Encapsulate Supabase authentication logic
- Examples: `src/hooks/useAuth.js`
- Pattern: Custom React hook returning user state, loading state, and auth methods
- Provides: signInWithEmail, signUpWithEmail, signOut, updatePassword, deleteAccount, biometric support

**Supabase Client Singleton:**
- Purpose: Single shared Supabase connection
- Examples: `src/lib/supabase.js`
- Pattern: createClient() called once, exported for reuse
- Uses environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

**Sortable Components:**
- Purpose: Drag-and-drop UI for reordering templates
- Examples: `SortableTemplateItem`, `SortableHomeTemplateButton` in BloggerMasterApp
- Pattern: @dnd-kit hooks (useSortable, DndContext) wrapped around template list items
- Provides: Reorderable template lists in home and settings

**Sub-components (Screens/Modals):**
- Purpose: Organize large JSX blocks into reusable components
- Examples: PasswordResetScreen, BiometricLockScreen, AdminSubscriptionControl
- Pattern: Defined as functions in BloggerMasterApp, not in separate files
- Advantage: Direct access to parent state without prop drilling

## Entry Points

**Browser Entry:**
- Location: `index.html`
- Triggers: User loads blue-review.com
- Responsibilities: Loads root div, injects Vite/React scripts, Google Sign-In SDK

**React Mount:**
- Location: `src/main.jsx`
- Triggers: Browser executes React client script
- Responsibilities: Creates React root, renders App component, applies StrictMode

**App Root:**
- Location: `src/App.jsx`
- Triggers: React initialization
- Responsibilities: Simple wrapper that renders BloggerMasterApp

**Main Application:**
- Location: `src/BloggerMasterApp.jsx` (4243 lines)
- Triggers: App component renders
- Responsibilities: Entire application logic—authentication flow, UI rendering, state management, data persistence

**Server-Side Endpoints:**
- `api/gcal-token.js` — Handles OAuth authorization code → access token exchange
- `api/gcal-refresh.js` — Refreshes expired Google Calendar tokens
- `api/gcal-callback.js` — Receives Google OAuth callback, stores tokens in URL hash

## Error Handling

**Strategy:** Mixed approach with error state and try-catch blocks

**Patterns:**

- **Authentication Errors:** Stored in `authError` state, translated to Korean via `translateError()` in LoginPage, displayed to user
- **Async Operations:** Wrapped in try-catch blocks; errors logged to console or stored in error state
- **API Failures:** Silently fail with `.catch(() => {})` for non-critical operations (weather, geolocation)
- **Validation:** Form-level validation before submission (email format, password length, required fields)
- **User Feedback:** Toast notifications for success/error (e.g., profile saved, schedule created)

## Cross-Cutting Concerns

**Logging:** 
- Approach: Browser console (limited use visible in code)
- No structured logging framework

**Validation:**
- Client-side only
- Email: basic existence and format check
- Password: minimum 6 characters
- Form fields: required field checks before submission

**Authentication:**
- Email/password via Supabase
- OAuth via Google, Kakao (configured in Supabase)
- Biometric via WebAuthn (browser API)
- Recovery: email-based password reset

**Internationalization:**
- All text is in Korean (no i18n library)
- Error messages translated in LoginPage via `translateError()`
- Hard-coded strings throughout

**Responsive Design:**
- Mobile-first approach with Tailwind breakpoints
- Font size adjusts based on window width: 22px desktop, 18px mobile
- Touch-friendly buttons with active:scale-95 feedback

---

*Architecture analysis: 2026-04-06*
