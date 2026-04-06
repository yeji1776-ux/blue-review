# Codebase Structure

**Analysis Date:** 2026-04-06

## Directory Layout

```
blog-app/
├── src/                           # React application source code
│   ├── main.jsx                  # React root entry point
│   ├── App.jsx                   # Top-level component wrapper
│   ├── BloggerMasterApp.jsx      # Main application (4243 lines)
│   ├── index.css                 # Global Tailwind + custom CSS
│   ├── App.css                   # App-specific styles
│   ├── hooks/                    # Custom React hooks
│   │   └── useAuth.js            # Authentication logic
│   ├── lib/                      # Utility libraries & clients
│   │   └── supabase.js           # Supabase client initialization
│   ├── components/               # Reusable React components
│   │   └── LoginPage.jsx         # Authentication UI component
│   └── assets/                   # Static images
│       ├── hero.png
│       ├── react.svg
│       └── vite.svg
├── api/                          # Serverless API endpoints (Vercel)
│   ├── gcal-token.js             # Google OAuth token exchange
│   ├── gcal-refresh.js           # Google token refresh
│   └── gcal-callback.js          # Google OAuth callback handler
├── public/                       # Static web assets
│   ├── favicon.png
│   ├── favicon-32.png
│   ├── apple-touch-icon.png
│   ├── landing.html              # Landing page (not used in SPA)
│   ├── terms.html                # Terms of service
│   ├── privacy.html              # Privacy policy
│   ├── guide.html                # User guide/help
│   └── icons.svg                 # Icon sprite sheet
├── index.html                    # HTML entry point (Vite)
├── vite.config.js                # Vite build configuration
├── eslint.config.js              # ESLint rules
├── package.json                  # Dependencies and scripts
├── package-lock.json             # Dependency lock file
└── .planning/                    # Documentation (generated)
    └── codebase/                 # Architecture analysis docs
        ├── ARCHITECTURE.md
        ├── STRUCTURE.md
        └── [others]
```

## Directory Purposes

**src/:**
- Purpose: React application source code
- Contains: Components, hooks, utilities, styles, assets
- Key files: BloggerMasterApp.jsx (main logic), useAuth.js (auth), supabase.js (client)

**src/hooks/:**
- Purpose: Custom React hooks for shared logic
- Contains: useAuth.js—authentication state and methods
- Pattern: Hooks return state and functions for use in components

**src/lib/:**
- Purpose: External library initialization and configuration
- Contains: Supabase client setup
- Pattern: Singleton clients exported for app-wide use

**src/components/:**
- Purpose: Reusable React components (separate from main app)
- Contains: LoginPage.jsx—authentication UI
- Note: Most components are defined inside BloggerMasterApp.jsx, not in separate files

**src/assets/:**
- Purpose: Static images and icons
- Contains: PNG images, SVG sprites
- Used by: Imported in JSX or CSS

**api/:**
- Purpose: Serverless functions deployed to Vercel
- Contains: Google Calendar OAuth handlers
- Deployment: Each file in api/ becomes a separate HTTP endpoint at `/api/[filename]`
- Environment: Runs on Vercel platform, accesses env variables

**public/:**
- Purpose: Static files served directly by web server
- Contains: Favicon, HTML pages, icons SVG
- Note: Some HTML files (landing.html, terms.html) are referenced but app is SPA, not multipage

**Root Configuration:**
- `.env` — Environment variables (secrets not included)
- `vite.config.js` — Vite build tool configuration
- `eslint.config.js` — Code linting rules
- `package.json` — Project metadata and dependencies

## Key File Locations

**Entry Points:**
- `index.html` — HTML document root, loads React and Vite modules
- `src/main.jsx` — React initialization, createRoot() call
- `src/App.jsx` — Top-level React component
- `src/BloggerMasterApp.jsx` — Main application component (entire app logic)

**Configuration:**
- `vite.config.js` — Build tool, Tailwind & React plugin setup
- `package.json` — Dependencies (React, Supabase, dnd-kit, Tailwind, Lucide)
- `index.html` — Vite entry HTML, Google Sign-In SDK script

**Core Logic:**
- `src/BloggerMasterApp.jsx` — All state management, routes, UI screens, business logic
- `src/hooks/useAuth.js` — Authentication hook (login, signup, logout, biometric)
- `src/lib/supabase.js` — Supabase client singleton

**Authentication UI:**
- `src/components/LoginPage.jsx` — Login/signup forms, OTP verification, password reset

**Styles:**
- `src/index.css` — Tailwind import, Tailwind theme variables, custom CSS classes
- `src/App.css` — Additional app-level styles (if any)

**API/Backend:**
- `api/gcal-token.js` — POST handler for Google auth code → access token
- `api/gcal-refresh.js` — POST handler for token refresh
- `api/gcal-callback.js` — GET handler for OAuth callback redirect

**Static Assets:**
- `public/favicon.png` — App icon
- `public/icons.svg` — Icon sprite for custom icons

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `LoginPage.jsx`, `App.jsx`)
- Utilities: camelCase (e.g., `supabase.js`, `useAuth.js`)
- Styles: camelCase with .css extension (e.g., `index.css`)
- API routes: kebab-case (e.g., `gcal-token.js`)

**Directories:**
- Lowercase, plural form for collections (e.g., `src/hooks/`, `src/components/`, `src/assets/`)
- Abbreviated names for feature directories (e.g., `api/`, `lib/`)

**React Components:**
- PascalCase function names inside files (e.g., `const LoginPage = ({ ... }) => { ... }`)
- Sub-components defined in same file (e.g., `SortableTemplateItem`, `BiometricLockScreen` in BloggerMasterApp)

**Constants/Types:**
- SCREAMING_SNAKE_CASE for constants (e.g., `ADMIN_EMAILS`, `PLAN_LIMITS`, `COLOR_THEMES`)
- camelCase for variables and functions

**State Hooks:**
- State: camelCase (e.g., `profile`, `schedules`, `templates`)
- Setters: `set` + PascalCase state name (e.g., `setProfile`, `setSchedules`, `setTemplates`)
- Booleans: `show`, `is`, `enabled` prefixes (e.g., `showSettings`, `isGuest`, `biometricEnabled`)

## Where to Add New Code

**New Feature (e.g., new schedule type, new report):**
- Primary code: Add state and UI inside `src/BloggerMasterApp.jsx` (main component)
- For large features: Consider extracting to separate component file in `src/components/`
- Persistence: Store data in localStorage with profile/schedules/templates pattern
- Example: New reporting feature → add state, add JSX screen, serialize to localStorage

**New Component/Module:**
- Implementation: If reusable, add to `src/components/[ComponentName].jsx`
- If single-use, define as function in BloggerMasterApp.jsx
- Import: Use named export from component file
- Props: Pass required state as props from BloggerMasterApp

**Utilities/Helpers:**
- Shared helpers: Add to `src/lib/` (e.g., `src/lib/helpers.js`)
- API clients: Add to `src/lib/` (e.g., `src/lib/supabase.js`)
- React hooks: Add to `src/hooks/` (e.g., `src/hooks/useAuth.js`)
- Export as default or named export for reuse

**API Endpoints:**
- Serverless functions: Add `.js` file to `api/` directory
- Pattern: `export default async function handler(req, res) { ... }`
- Access env vars: `process.env.VITE_[VAR_NAME]` or `process.env.[VAR_NAME]`
- Deploy: Automatic via Vercel, accessible at `/api/[filename]`

**Styles:**
- Global styles: `src/index.css` (imported in main.jsx)
- Component-scoped: Use Tailwind classes inline in JSX, not separate CSS files
- Custom CSS classes: Define in `src/index.css` (e.g., `.jelly-card`, `.jelly-button`, `.ambient-blob`)
- Theme colors: CSS variables defined in `index.css` @theme, applied via Tailwind classes

## Special Directories

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (via npm install)
- Committed: No (in .gitignore)
- Major packages: React 19, @supabase/supabase-js, @dnd-kit, Tailwind, Lucide, Vite

**dist/:**
- Purpose: Production build output
- Generated: Yes (via vite build)
- Committed: No (in .gitignore)
- Contains: Minified JS, CSS, assets ready for deployment

**.planning/codebase/:**
- Purpose: Architecture and codebase analysis documentation
- Generated: Via GSD mapper tool
- Committed: Yes (for team reference)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**.env files:**
- Purpose: Environment variables (secrets, API keys)
- Contains: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GOOGLE_CLIENT_ID
- Committed: No (in .gitignore)
- Security: Never commit credentials

**.git/:**
- Purpose: Git version control repository
- Generated: Yes (via git init)
- Committed: Not applicable

**.vercel/:**
- Purpose: Vercel deployment configuration cache
- Generated: Yes (via Vercel CLI)
- Committed: Typically no

---

*Structure analysis: 2026-04-06*
