# Testing Patterns

**Analysis Date:** 2026-04-06

## Test Framework

**Status:** Not implemented

**Runner:**
- No test runner configured (Jest, Vitest, etc. not in devDependencies)

**Assertion Library:**
- Not present

**Run Commands:**
- No test scripts in `package.json`

## Test File Organization

**Status:** Not applicable

No test files found in source directories (only node_modules/zod tests, which are from dependencies).

## Current State

**Testing Infrastructure:**
- Zero test coverage in source code (`/src` directory)
- No `__tests__`, `.test.js`, or `.spec.js` files present
- No test configuration files (`jest.config.js`, `vitest.config.js`)

## Manual Testing Approach

The codebase currently relies on manual testing:

**UI Testing:**
- React Strict Mode enabled in `src/main.jsx` for development-time issue detection
- Component development with hot reload via Vite

**Integration Testing:**
- Supabase integration tested manually through UI workflows
- Google Calendar OAuth flow tested manually

**Error Scenarios:**
- Error handling implemented and tested manually (e.g., auth failures in `src/components/LoginPage.jsx`)
- Network errors caught with try-catch blocks

## Key Testable Areas (Not Currently Tested)

**Authentication (`src/hooks/useAuth.js`):**
- Session retrieval
- OAuth provider sign-in
- Email/password authentication
- OTP verification
- Password reset and update
- Account deletion with local storage cleanup
- Session subscription management

**Error Translation (`src/components/LoginPage.jsx`):**
- `translateError()` function mapping Supabase errors to user-friendly Korean messages
- Test cases for: invalid credentials, unconfirmed email, duplicate accounts, password validation, rate limiting, network errors

**Data Management:**
- Profile save/update operations
- Template CRUD operations
- Schedule management and date parsing
- Hashtag management
- File operations (screenshot/image export)

**Google Calendar Integration:**
- Token exchange (`api/gcal-token.js`)
- Token refresh (`api/gcal-refresh.js`)
- OAuth callback handling (`api/gcal-callback.js`)

**Date/Time Utilities:**
- D-day calculations
- Date parsing from various formats
- Schedule month/date extraction
- Deadline vs. experience period date handling

## Recommended Testing Setup

**For Future Implementation:**

```bash
# Install testing dependencies
npm install --save-dev vitest @testing-library/react @testing-library/user-event happy-dom
```

**Vitest Configuration:**
```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

**Test File Location Pattern:**
- Co-locate test files with source: `src/hooks/useAuth.test.js`
- Component tests: `src/components/LoginPage.test.jsx`
- Utility tests: `src/lib/supabase.test.js`

## Code Patterns Supporting Testing (When Tests Are Added)

**Error Handling for Testability:**
- Async functions return `{ data, error }` objects (Supabase convention) - easily assertable
- Error messages separated into `translateError()` function - easy to unit test
- State management in components via `useState` - easy to mock and test

**Mocking Strategy (When Tests Are Added):**
```javascript
// Mock Supabase client
vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithPassword: vi.fn(),
      // ... other methods
    }
  }
}))

// Mock localStorage for auth state persistence tests
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} }
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
```

**What to Mock:**
- `supabase` client and all auth methods
- `localStorage` for preference/state persistence tests
- `window.location` for OAuth redirect tests
- `fetch()` calls in API handlers

**What NOT to Mock:**
- React hooks (`useState`, `useEffect`, `useRef`)
- Event handlers and user interactions
- Utility functions like `translateError()`
- Date/time parsing logic

## Coverage Gaps (Critical)

**Authentication Flow:**
- No tests for Supabase OAuth flow
- No tests for email/password signup and verification
- No tests for account deletion and local storage cleanup

**UI Components:**
- No tests for form validation
- No tests for error message display
- No tests for loading states

**Data Persistence:**
- No tests for localStorage read/write
- No tests for Supabase data sync

**Google Calendar Integration:**
- No tests for token exchange and refresh
- No tests for OAuth callback parsing
- No tests for error handling in token operations

**Date Utilities:**
- No tests for D-day calculation logic (`getDday()`)
- No tests for date parsing (`parseDeadlineToDate()`, `parseExperienceStartDate()`)
- No tests for schedule filtering by date

---

*Testing analysis: 2026-04-06*
