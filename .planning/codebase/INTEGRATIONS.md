# External Integrations

**Analysis Date:** 2026-04-06

## APIs & External Services

**Authentication & User Management:**
- Supabase Auth - User authentication and session management
  - SDK/Client: `@supabase/supabase-js` 2.99.1
  - Env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
  - Implementation: `src/lib/supabase.js`
  - Supports: Email/password signup, OAuth providers, password reset, session management

**Calendar Integration:**
- Google Calendar API - Read/write access to user calendars
  - OAuth 2.0 flow for authorization
  - Scope: `https://www.googleapis.com/auth/calendar`
  - Endpoints used:
    - `https://www.googleapis.com/calendar/v3/users/me/calendarList` - List user calendars
    - `https://www.googleapis.com/calendar/v3/calendars/{calId}/events` - CRUD operations
  - Token refresh: Custom endpoint at `/api/gcal-refresh` (Vercel serverless)
  - OAuth callback: `/api/gcal-callback` (Vercel serverless)
  - Client ID: VITE_GOOGLE_CLIENT_ID
  - Client Secret: GOOGLE_CLIENT_SECRET (server-only)
  - Implementation: `src/BloggerMasterApp.jsx` (lines ~1200-1400)

**AI & Content Generation:**
- Google Gemini API - AI-powered content generation
  - Model: gemini-2.5-flash
  - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
  - Auth: API key in VITE_GEMINI_API_KEY
  - Usage: Content suggestions and AI features in main app

**Weather & Location:**
- wttr.in API - Weather forecasts (public, no auth required)
  - Endpoint: `https://wttr.in/{location}?format=j1`
  - Usage: Weather display in app
  - Implementation: `src/BloggerMasterApp.jsx` (fetchWeather function)

- OpenStreetMap Nominatim - Reverse geocoding (public, no auth required)
  - Endpoint: `https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&accept-language=ko`
  - Usage: Convert GPS coordinates to location names
  - Implementation: `src/BloggerMasterApp.jsx` (location name resolution)

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: Via Supabase client with VITE_SUPABASE_URL
  - Client: @supabase/supabase-js
  - Accessible from: `src/lib/supabase.js` exports

**RPC Functions (Supabase):**
- `get_all_users_admin` - Admin function to retrieve all users
- `set_user_subscription` - Admin function to update user subscription plan
- `delete_user` - User account deletion (called in `src/hooks/useAuth.js`)
- Implementation location: `src/BloggerMasterApp.jsx` (admin functions), `src/hooks/useAuth.js` (user functions)

**Local Storage:**
- Browser localStorage - Persistent user preferences
  - Keys used: `blogger_profile`, `blogger_templates`, `blogSchedules`, `blogger_saved_texts`, `blogger_hashtags`, `blogger_font_size`, `theme_color`, `rememberMe`, `biometric_enabled`, `biometric_cred_id`
  - Implementation: `src/hooks/useAuth.js`, `src/BloggerMasterApp.jsx`

- Browser sessionStorage - Session-specific state
  - Keys used: `noRemember`, `biometricUnlocked`
  - Implementation: `src/BloggerMasterApp.jsx`

**File Storage:**
- Not explicitly integrated; uses browser APIs (html2canvas, modern-screenshot) for client-side screenshot generation

**Caching:**
- None detected; relies on browser HTTP caching and Vercel edge caching

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (primary) - Email/password and OAuth
  - Implementation: `src/hooks/useAuth.js`
  - Methods: signInWithProvider, signUpWithEmail, signInWithPassword, signInWithOAuth
  - OAuth flows: Google, Kakao (via Supabase provider)

- Google OAuth 2.0 (secondary, for Calendar access)
  - Authorization endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
  - Token endpoint: `https://oauth2.googleapis.com/token`
  - Redirect URI: `https://www.blue-review.com/api/gcal-callback`
  - Implementation: `api/gcal-callback.js`, `api/gcal-token.js`, `api/gcal-refresh.js`
  - Token storage: URL hash parameters (gcal_token, gcal_expiry, gcal_refresh)

**Biometric Authentication:**
- WebAuthn API - Face/fingerprint unlock (browser native)
  - Credential storage: localStorage (biometric_cred_id)
  - Session flag: sessionStorage (biometricUnlocked)
  - Implementation: `src/BloggerMasterApp.jsx` (BiometricLockScreen component)

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Console logging only (console.log, console.error)
- No structured logging or centralized log collection

## CI/CD & Deployment

**Hosting:**
- Vercel - Deployed at blue-review.com

**CI Pipeline:**
- None detected in codebase

**Serverless Functions:**
- Vercel Edge/Serverless Functions in `api/` directory:
  - `api/gcal-callback.js` - OAuth callback handler
  - `api/gcal-refresh.js` - Token refresh endpoint
  - `api/gcal-token.js` - Token exchange endpoint
- Runtime: Node.js (Vercel's default)

## Environment Configuration

**Required env vars (Frontend - VITE_ prefix):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase public/anon key
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `VITE_GEMINI_API_KEY` - Google Gemini API key

**Required env vars (Backend - process.env):**
- `VITE_GOOGLE_CLIENT_ID` - (also read by API routes)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (Vercel deployment only)

**Secrets location:**
- `.env.local` - Local development (git ignored)
- `.env.vercel.local` - Vercel preview/prod deployment config
- Vercel dashboard environment variables - Production secrets
- `.env` file exists but contents not detailed (credential protection)

## Webhooks & Callbacks

**Incoming:**
- `/api/gcal-callback` - Google OAuth redirect URL
  - Receives: Authorization code from Google
  - Returns: Redirect to app with token in hash

**Outgoing:**
- Google Calendar API events - Direct API calls (no webhooks)
  - Create, read, update, delete calendar events
- Google Gemini API - Synchronous API calls (no webhooks)
- wttr.in / Nominatim - Synchronous API calls (no webhooks)

---

*Integration audit: 2026-04-06*
