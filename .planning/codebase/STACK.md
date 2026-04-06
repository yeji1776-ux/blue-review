# Technology Stack

**Analysis Date:** 2026-04-06

## Languages

**Primary:**
- JavaScript (ES2020+) - React components, hooks, frontend logic in `src/`
- JSX - React component syntax throughout `src/components/` and main app

**Secondary:**
- JavaScript (Node.js) - API route handlers in `api/` directory

## Runtime

**Environment:**
- Node.js v18+ (tested with v22.22.0)

**Package Manager:**
- npm v10.9.4+
- Lockfile: `package-lock.json` (present)
- Config: `.npmrc` with `legacy-peer-deps=true` (required for peer dependency resolution)

## Frameworks

**Core:**
- React 19.2.4 - Main UI framework
- React DOM 19.2.4 - DOM rendering

**Build/Dev:**
- Vite 8.0.0 - Build tool and dev server, configured in `vite.config.js`
- @vitejs/plugin-react 6.0.0 - React support for Vite
- @tailwindcss/vite 4.2.1 - Tailwind CSS integration with Vite

**Styling:**
- Tailwind CSS 4.2.1 - Utility-first CSS framework
- Custom CSS in `src/index.css`

**UI Components:**
- lucide-react 0.577.0 - Icon library for React

**Linting:**
- ESLint 9.39.4
- eslint-plugin-react-hooks 7.0.1
- eslint-plugin-react-refresh 0.5.2
- @eslint/js 9.39.4
- globals 17.4.0

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.99.1 - Database and authentication client
  - Used in `src/lib/supabase.js` and `src/hooks/useAuth.js`
  - Handles auth (email/password, OAuth), sessions, RPC functions

**Frontend Utilities:**
- @dnd-kit/core 6.3.1 - Drag-and-drop library
- @dnd-kit/sortable 10.0.0 - Sortable behavior for drag-and-drop
- @dnd-kit/utilities 3.2.2 - DnD utility functions
  - Used in `src/BloggerMasterApp.jsx` for template and schedule reordering

**Content & Export:**
- html2canvas 1.4.1 - Convert HTML to PNG/JPEG images
- modern-screenshot 4.6.8 - Alternative screenshot/screenshot library

**Type Definitions (Dev):**
- @types/react 19.2.14
- @types/react-dom 19.2.3

## Configuration

**Environment Variables:**
- VITE_SUPABASE_URL - Supabase project URL
- VITE_SUPABASE_ANON_KEY - Supabase anonymous public key
- VITE_GOOGLE_CLIENT_ID - Google OAuth client ID for Calendar integration
- VITE_GEMINI_API_KEY - Google Gemini API key for AI features
- GOOGLE_CLIENT_SECRET - Google OAuth client secret (server-only, in API routes)

**Build:**
- `vite.config.js` - Vite configuration with React and Tailwind plugins
- `.eslintrc.js` (flatConfig format) - ESLint rules for JS/JSX files
- `index.html` - HTML entry point with favicon, fonts, and Google Sign-In script
- `package.json` - Dependencies and npm scripts

**Google Fonts:**
- Plus Jakarta Sans (weights: 400, 500, 600, 700, 800) - Primary font
- Material Symbols Outlined - Icon font system

**Google Scripts:**
- Google Sign-In client (`accounts.google.com/gsi/client`) - OAuth authentication

## Platform Requirements

**Development:**
- Node.js v18 or higher
- npm v10+
- Modern web browser with WebGL support (for screenshot libraries)
- WebAuthn support recommended (for biometric authentication features)

**Production:**
- Deployment target: Vercel (serverless functions in `api/` directory)
- Domain: blue-review.com
- Edge/Serverless runtime compatible

---

*Stack analysis: 2026-04-06*
