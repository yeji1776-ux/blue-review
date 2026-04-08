# Phase 1: Foundation - Research

**Researched:** 2026-04-09
**Domain:** React 19 리팩토링 인프라 — react-error-boundary, zod, 커스텀 훅 추출, 폴더 구조
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Feature 폴더 구조**
- D-01: `src/features/` 아래 기능별로 완전 분리 — `schedule/`, `template/`, `calendar/`, `profile/`, `settings/` 5개 feature
- D-02: 각 feature 폴더 내부에 `components/`, `hooks/`, `services/`, `constants/` 하위 폴더 구성 (Phase 1에서는 일부 비어 있을 수 있음)
- D-03: 공통 UI 컴포넌트(ErrorBoundary, Card, Button 등)는 기존 `src/components/` 아래 `ui/` 하위 폴더로 분리

**커스텀 훅 경계**
- D-04: 5개 핵심 도메인 훅 — `useSchedules`, `useTemplates`, `useProfile`, `useGoogleCalendar`, `useWeather`
- D-05: 각 훅은 해당 도메인의 상태와 사이드이펙트(localStorage 읽기/쓰기, 동기화)를 완전히 소유
- D-06: Phase 1에서 훅은 기존 localStorage 로직을 그대로 내부로 캡슐화 — service 레이어 추상화는 Phase 2
- D-07: UI 로컬 상태(탭 선택, 모달 열림 등)는 훅이 아니라 Screen 컴포넌트 자체에 유지

**에러 바운더리 UX**
- D-08: fallback UI는 해당 영역만 대체하는 인라인 경량 UI — 에러 메시지 + 다시 시도 버튼
- D-09: fallback 디자인은 기존 `jelly-card`/`sky-*` 팔레트와 톤 맞춤, 한국어 메시지
- D-10: 적용 범위 3곳 — 최상위 App 루트, Calendar 영역, Templates 영역
- D-11: 에러 로깅은 `console.error`로 기본 기록

**Zod 검증 전략**
- D-12: JSON.parse 실패 시 안전한 기본값(빈 배열 또는 기본 객체) 반환 + `console.warn`으로 경고
- D-13: Zod 스키마는 feature별로 정의 — `src/features/{domain}/schemas.js`
- D-14: 기존 9개 `JSON.parse` 호출을 하나씩 안전 파서 유틸(`parseWithSchema` 등)로 교체

### Claude's Discretion
- ErrorBoundary 컴포넌트의 정확한 JSX/Tailwind 마크업
- Zod 스키마의 필드별 세부 타입 정의 (optional/nullable 결정)
- 상수 파일 이름 외 내부 그룹핑 방식 (`storageKeys.js`, `plans.js`, `admin.js` 등 분할 여부)
- 각 도메인 훅의 내부 API 형태 (반환 객체 키 이름)

### Deferred Ideas (OUT OF SCOPE)
- Service 레이어 추상화 (`scheduleService` 등) — Phase 2에서 Supabase 이전과 함께
- Screen 분리 및 BloggerMasterApp 해체 — Phase 3
- 모든 Screen에 에러 바운더리 세분화 — Phase 3
- 원격 에러 로깅/모니터링 — 마일스톤 out of scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | 앱 전체와 주요 기능(Calendar, Templates)에 React Error Boundary 적용 | ErrorBoundary 배치 3곳 확인, react-error-boundary 6.1.1 React 19 호환 검증 |
| INFRA-02 | 9개 JSON.parse 호출에 Zod v4 스키마 검증 적용, 파싱 실패 시 안전한 기본값 반환 | 9개 JSON.parse 위치 라인별 매핑 완료, zod 4.3.6 설치 확인 |
| INFRA-03 | 매직 스트링(탭명, 플랜 제한, 관리자 이메일)을 src/constants/로 추출 | 상수 위치 및 분류 기준 문서화 |
| INFRA-04 | Feature 기반 폴더 구조 적용 (src/features/{schedule,template,calendar,profile,settings}/) | 폴더 구조 및 생성 순서 정의 |
| STATE-01 | BloggerMasterApp의 50+ useState를 도메인별 커스텀 훅으로 추출 | 각 도메인 useState/useEffect/localStorage 라인 매핑 완료 |
| STATE-02 | 각 커스텀 훅이 자신의 상태와 사이드이펙트를 완전히 소유 | useAuth.js 패턴 참고, 훅 API 설계 가이드 |
</phase_requirements>

---

## Summary

Phase 1은 4,243줄 단일 파일(`BloggerMasterApp.jsx`)을 분해하기 위한 준비 인프라를 구축한다. 핵심은 세 가지다: (1) `react-error-boundary` + `zod` 라이브러리 설치, (2) 상수/폴더 구조 생성, (3) 5개 도메인 커스텀 훅 추출. 이 과정에서 `BloggerMasterApp.jsx` 파일 자체는 삭제하지 않는다 — 내부에서 상태/로직 호출을 새 훅으로 교체하는 것이 전부다.

코드베이스 분석을 통해 정확한 작업 범위가 확인됐다. JSON.parse 호출은 9곳 모두 라인 식별 완료. localStorage 키는 16개. 도메인별 useState 경계가 명확히 구분된다. 특히 `schedules`/`templates`/`profile` 3개 도메인은 이미 Supabase `user_data` 테이블과 연동 중이므로, 훅 추출 시 debounce upsert 로직도 함께 옮겨야 한다.

**Primary recommendation:** 의존성이 가장 낮은 `useWeather` → `useProfile` → `useTemplates` → `useSchedules` → `useGoogleCalendar` 순서로 훅을 추출한다. 각 훅 추출 후 `npm run build` 통과 + 수동 탭 동작 확인을 gate로 삼는다.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-error-boundary | 6.1.1 | ErrorBoundary 컴포넌트 제공 | React 팀 권장 패턴, `useErrorBoundary` 훅 포함, React 18/19 공식 지원 |
| zod | 4.3.6 | 런타임 스키마 검증 + 안전한 파싱 | TypeScript-first, `safeParse` API로 예외 없는 파싱, Phase 2 Supabase 타입에도 재사용 가능 |

**Version verification:** [VERIFIED: npm registry — 2026-04-09]
- `react-error-boundary@6.1.1` peerDependencies: `react: '^18.0.0 || ^19.0.0'` — React 19.2.4 호환 확인
- `zod@4.3.6` — 최신 안정 버전

### Supporting (Phase 1에서 신규 설치 불필요)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | 2.99.1 | 이미 설치됨 — Supabase upsert debounce 훅에서 계속 사용 | 모든 도메인 훅의 클라우드 동기화 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-error-boundary | 직접 클래스 컴포넌트 작성 | 직접 작성은 300줄 이상, 훅 지원 없음 |
| zod | yup / joi | zod가 번들 크기 최소, TypeScript 추론 최적, Phase 2 재사용성 높음 |

**Installation:**
```bash
npm install react-error-boundary zod
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 1 완료 후)

```
src/
├── constants/
│   ├── storageKeys.js      # 모든 localStorage 키 상수 (16개)
│   ├── plans.js            # PLAN_LIMITS, PLAN_META
│   └── admin.js            # ADMIN_EMAILS
├── features/
│   ├── schedule/
│   │   ├── hooks/          # useSchedules.js
│   │   ├── schemas.js      # Zod 스키마
│   │   ├── components/     # (비어 있음 — Phase 3에서 채움)
│   │   ├── services/       # (비어 있음 — Phase 2에서 채움)
│   │   └── constants/      # (비어 있음)
│   ├── template/
│   │   ├── hooks/          # useTemplates.js
│   │   └── schemas.js
│   ├── calendar/
│   │   ├── hooks/          # useGoogleCalendar.js
│   │   └── schemas.js
│   ├── profile/
│   │   ├── hooks/          # useProfile.js
│   │   └── schemas.js
│   └── settings/
│       ├── hooks/          # useWeather.js (날씨/위치/테마/폰트)
│       └── schemas.js
├── components/
│   ├── ui/
│   │   └── ErrorBoundary.jsx   # 공통 ErrorBoundary 컴포넌트
│   └── LoginPage.jsx           # 기존 유지
├── hooks/
│   └── useAuth.js              # 기존 유지
├── lib/
│   └── supabase.js             # 기존 유지
└── BloggerMasterApp.jsx        # Phase 1에서 내부 교체만, 파일 유지
```

### Pattern 1: Zod safeParse 유틸 래퍼

**What:** localStorage JSON.parse를 `safeParse` 기반 유틸로 교체
**When to use:** 모든 localStorage 읽기 시점

```javascript
// src/lib/parseWithSchema.js
// Source: Zod 공식 문서 safeParse API
export function parseWithSchema(schema, raw, fallback) {
  if (!raw) return fallback;
  try {
    const json = JSON.parse(raw);
    const result = schema.safeParse(json);
    if (result.success) return result.data;
    console.warn('[parseWithSchema] 스키마 검증 실패, 기본값 사용:', result.error.issues);
    return fallback;
  } catch (e) {
    console.warn('[parseWithSchema] JSON 파싱 실패, 기본값 사용:', e.message);
    return fallback;
  }
}
```

**기존 패턴 → 교체 패턴:**
```javascript
// 기존 (라인 419)
const saved = localStorage.getItem('blogger_templates');
return saved ? JSON.parse(saved) : [defaultTemplate];

// 교체 후
import { parseWithSchema } from '../../../lib/parseWithSchema';
import { templatesSchema } from '../schemas';
return parseWithSchema(templatesSchema, localStorage.getItem(STORAGE_KEYS.TEMPLATES), [defaultTemplate]);
```

### Pattern 2: 도메인 훅 구조 (useAuth.js 패턴 적용)

**What:** useState + useEffect + localStorage 로직을 단일 훅으로 캡슐화
**When to use:** 각 도메인 훅 (useSchedules, useTemplates, useProfile, useWeather, useGoogleCalendar)

```javascript
// Source: src/hooks/useAuth.js 기존 패턴 참고
// src/features/template/hooks/useTemplates.js
import { useState } from 'react';
import { parseWithSchema } from '../../../lib/parseWithSchema';
import { templatesSchema } from '../schemas';
import { STORAGE_KEYS } from '../../../constants/storageKeys';

const DEFAULT_TEMPLATES = [
  { id: 1, title: '기본 신청 문구', content: '...' },
];

export function useTemplates() {
  const [templates, setTemplates] = useState(() =>
    parseWithSchema(templatesSchema, localStorage.getItem(STORAGE_KEYS.TEMPLATES), DEFAULT_TEMPLATES)
  );

  const saveTemplates = (updated) => {
    setTemplates(updated);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(updated));
  };

  return { templates, saveTemplates, setTemplates };
}
```

### Pattern 3: ErrorBoundary 적용 (react-error-boundary)

**What:** `ErrorBoundary` 컴포넌트로 특정 영역 감싸기
**When to use:** App 루트, Calendar 영역, Templates 영역

```jsx
// Source: react-error-boundary 공식 API
// src/components/ui/ErrorBoundary.jsx
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

function FallbackComponent({ error, resetErrorBoundary }) {
  return (
    <div className="jelly-card p-6 text-center space-y-3">
      <p className="text-sm font-bold text-slate-600">이 영역에서 오류가 발생했어요.</p>
      <p className="text-xs text-slate-400">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-sky-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
      >
        다시 시도
      </button>
    </div>
  );
}

export function AppErrorBoundary({ children }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={FallbackComponent}
      onError={(error) => console.error('[ErrorBoundary]', error)}
    >
      {children}
    </ReactErrorBoundary>
  );
}
```

**적용 위치:**
```jsx
// src/App.jsx — 루트 ErrorBoundary
import { AppErrorBoundary } from './components/ui/ErrorBoundary';
function App() {
  return (
    <AppErrorBoundary>
      <BloggerMasterApp />
    </AppErrorBoundary>
  );
}

// BloggerMasterApp.jsx — Calendar 영역 (라인 2485 근처)
{activeTab === 'calendar' && (
  <AppErrorBoundary key="calendar">
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 기존 Calendar JSX */}
    </div>
  </AppErrorBoundary>
)}

// BloggerMasterApp.jsx — Templates 영역 (홈 탭 editingTemplateId 'list' 모달 또는 설정 탭)
// Templates는 'tool' 탭(라인 2209)에 위치 — 해당 activeTab 블록 전체를 감싸거나
// editingTemplateId 관련 모달 JSX 영역을 특정해서 감쌈
```

### Anti-Patterns to Avoid

- **BloggerMasterApp 파일 삭제 (Phase 1에서):** 파일 내부 호출만 교체. 파일 삭제는 Phase 3 작업
- **훅에 UI 로컬 상태 포함:** `editingTemplateId`, `showSettings`, 탭 선택 상태는 훅이 아닌 컴포넌트에 유지 (D-07)
- **service 레이어 추상화:** `scheduleService.save()` 같은 추상화는 Phase 2. Phase 1은 localStorage 직접 호출 유지
- **한 번에 여러 훅 동시 추출:** 한 훅씩 추출 후 빌드 확인. 동시 다발 교체 시 디버깅 불가

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ErrorBoundary 클래스 컴포넌트 | 직접 componentDidCatch 작성 | react-error-boundary | 훅(`useErrorBoundary`) 포함, React 19 최적화됨, 300줄 절약 |
| JSON 안전 파싱 | try-catch 래퍼 직접 작성 | zod `schema.safeParse()` + `parseWithSchema` 유틸 | 스키마 재사용, 타입 안전성, Phase 2 Supabase 타입과 공유 가능 |
| localStorage 키 상수 | 문자열 인라인 사용 | `src/constants/storageKeys.js` | 오타 방지, 전체 검색/교체 가능, Phase 2 키 이름 보호 |

**Key insight:** react-error-boundary의 `useErrorBoundary` 훅은 자식 컴포넌트에서 명시적으로 에러를 throw할 때도 사용 가능 — 향후 비동기 에러도 경계로 포착 가능.

---

## Domain State Inventory (핵심 발견)

### JSON.parse 9곳 위치 — 전체 매핑

[VERIFIED: src/BloggerMasterApp.jsx 직접 분석]

| # | 라인 | localStorage 키 | 스키마 도메인 | 기본값 형태 |
|---|------|-----------------|--------------|------------|
| 1 | 392 | `blogger_profile` | profile | `{ nickname: '', blogUrl: '', ... enabledPlatforms: {...} }` (병합 로직 포함) |
| 2 | 419 | `blogger_templates` | template | `[{ id, title, content }]` |
| 3 | 463 | `blogger_ftc_templates` | template | `[{ id, title, content }]` |
| 4 | 494 | `blogger_hashtags` | settings | `{ '맛집': [...], '뷰티': [...], ... }` (카테고리 → 배열 객체) |
| 5 | 611 | `blogger_profile` (gcalSelectedCal 필드) | calendar | `string` — 기본값 `'primary'` |
| 6 | 647 | `blogger_profile` (gcalSelectedCal 재참조) | calendar | `string` — 기본값 `'primary'` |
| 7 | 764 | `blogger_saved_texts` | settings | `[]` |
| 8 | 827 | `blogSchedules` | schedule | `[]` (예시 데이터 필터링 로직 포함) |
| 9 | 1322 | Gemini API 응답 JSON (localStorage 아님) | schedule | `emptyParsed` 객체 |

**주의:** #5/#6은 동일 키(`blogger_profile`)를 두 곳에서 직접 읽음 — 훅 추출 시 이 두 곳 모두 `useGoogleCalendar`에서 `useProfile`의 데이터를 참조하는 방식으로 정리 필요.

**주의 #9:** 라인 1322의 `JSON.parse`는 localStorage가 아닌 Gemini API 응답 파싱 — zod 적용 시 `scheduleSchema.partial().safeParse()`로 교체.

### localStorage 키 완전 목록

[VERIFIED: src/BloggerMasterApp.jsx 직접 분석, src/hooks/useAuth.js 참조]

| 키 이름 | 도메인 | 값 형태 | 비고 |
|---------|--------|--------|------|
| `blogger_profile` | profile | JSON 객체 | 가장 많이 참조 (6+회), gcalSelectedCal 포함 |
| `blogger_templates` | template | JSON 배열 | |
| `blogger_ftc_templates` | template | JSON 배열 | |
| `blogger_hashtags` | settings | JSON 객체(카테고리→배열) | |
| `blogger_saved_texts` | settings | JSON 배열 | |
| `blogger_font_size` | settings | 숫자 문자열 | parseInt 필요 |
| `theme_color` | settings | 문자열 enum | `'sky'|'blue'|'indigo'|'cyan'|'navy'` |
| `blogSchedules` | schedule | JSON 배열 | |
| `gcal_token` | calendar | 문자열 | OAuth access token |
| `gcal_token_expiry` | calendar | 숫자 문자열 | timestamp ms |
| `gcal_refresh_token` | calendar | 문자열 | OAuth refresh token |
| `gcal_selected_cal` | calendar | 문자열 | calendar ID |
| `location_perm` | settings | `'always'` | 위치 권한 영구 허용 |
| `biometric_enabled` | auth | `'1'` | 생체인증 활성화 플래그 |
| `biometric_cred_id` | auth | base64 문자열 | WebAuthn credential ID |
| `rememberMe` | auth | (useAuth.js deleteAccount에서 삭제) | |

**sessionStorage 키 (참고 — localStorage 아님):**

| 키 이름 | 용도 |
|---------|------|
| `noRemember` | 탭 닫을 때 세션 제거 플래그 |
| `biometricUnlocked` | 생체 잠금 해제 플래그 |
| `location_perm` | 위치 권한 세션 허용 |

### 도메인별 useState 매핑

[VERIFIED: src/BloggerMasterApp.jsx 라인별 확인]

#### useWeather 도메인 (라인 317~373)
- `weather` (317) — 날씨 객체 `{ temp, desc, icon, score, tip, location }`
- `locationPopup` (318) — 위치 권한 팝업 열림 여부
- `useEffect` (365) — mount 시 위치 권한 확인 + 날씨 fetch
- `fetchWeather()`, `requestLocation()` 함수
- localStorage: `location_perm` (읽기/쓰기), sessionStorage: `location_perm`

#### useProfile 도메인 (라인 376~414)
- `profile` (376) — 프로필 객체 (JSON.parse #1, 라인 392)
- `profileSaved` (400) — 저장 완료 토스트
- `profileSubTab` (401) — 'basic' | 'platform' (UI 로컬 상태 — 훅에 넣지 않음, D-07)
- `newPassword`, `confirmPassword`, `passwordMsg` — auth 관련 (useAuth에 속함)
- `saveProfile()`, `updateProfile()` 함수
- localStorage: `blogger_profile` 읽기/쓰기

**주의:** `profile` 상태는 Supabase `user_data` 테이블과도 연동 (라인 857~866). 훅 추출 시 `user` prop 또는 Supabase sync 콜백을 인자로 받아야 함.

#### useTemplates 도메인 (라인 417~489)
- `templates` (417) — 협찬 신청 문구 배열 (JSON.parse #2, 라인 419)
- `editingTemplateId` (423) — UI 로컬 상태 (D-07, 훅에 넣지 않음)
- `ftcTemplates` (461) — 공정위 문구 배열 (JSON.parse #3, 라인 463)
- `editingFtcTemplateId` (467) — UI 로컬 상태 (D-07)
- `saveTemplates()`, `addTemplate()`, `updateTemplate()`, `deleteTemplate()`, `closeTemplateModal()` 함수
- `saveFtcTemplates()`, `addFtcTemplate()`, `updateFtcTemplate()`, `deleteFtcTemplate()`, `closeFtcTemplateModal()` 함수
- localStorage: `blogger_templates`, `blogger_ftc_templates`
- **의존성:** `PLAN_LIMITS`, `userPlan`, `setShowUpgradeModal`, `setUpgradeReason` — 이 의존성을 훅 인자로 받거나 반환값에서 처리 필요

#### useGoogleCalendar 도메인 (라인 543~707)
- `gcalToken` (565) — access token (초기화 시 URL hash 파싱 포함)
- `gcalConnecting` (586) — 연결 중 플래그
- `gcalCalendars` (609) — 캘린더 목록
- `gcalSelectedCal` (610) — 선택된 캘린더 ID (JSON.parse #5, 라인 611)
- `useEffect` (588) — token needs_refresh 처리
- `useEffect` (636) — 캘린더 목록 fetch (JSON.parse #6, 라인 647)
- `refreshGcalToken()`, `connectGoogleCalendar()`, `disconnectGoogleCalendar()`, `getValidGcalToken()`, `syncToGoogleCalendar()`, `deleteFromGoogleCalendar()` 함수
- localStorage: `gcal_token`, `gcal_token_expiry`, `gcal_refresh_token`, `gcal_selected_cal`

#### useSchedules 도메인 (라인 757~899)
- `schedules` (824) — 스케줄 배열 (JSON.parse #8, 라인 827)
- `selectedScheduleId` (757) — UI 로컬 상태 (D-07)
- `isModalOpen` (758) — UI 로컬 상태 (D-07)
- `savedTexts` (762) — 저장된 글 배열 (JSON.parse #7, 라인 764)
- `parsedData` (915) — Gemini 파싱 결과 임시 상태
- `useEffect` (840) — schedules 변경 시 localStorage 자동 저장
- `useEffect` (848) — user 로그인 시 Supabase에서 데이터 로드 (schedules + templates + profile + hashtags + savedTexts)
- `useEffect` (885) — 데이터 변경 시 Supabase upsert debounce (1.5초)
- `deleteSchedule()`, `handleSmartParsing()` 함수
- localStorage: `blogSchedules`, `blogger_saved_texts`
- **주의:** 라인 848-882의 Supabase load 이펙트는 schedules뿐 아니라 templates, hashtags, profile, savedTexts도 함께 로드함 — 이 이펙트를 어느 훅에 귀속시킬지 결정 필요

#### 설정 도메인 (settings — useWeather에 합산하거나 별도)
- `fontSize` (516), `themeColor` (530) — localStorage 읽기/쓰기
- `showSettings` (710) — UI 로컬 상태 (D-07)
- `userPlan` (729), `planExpiresAt` (730), `isAdmin` (731) — Supabase 로드 값
- `adminUsers` (734), `adminLoading` (735) — 관리자 전용

---

## Common Pitfalls

### Pitfall 1: Supabase 복합 useEffect 분리 문제
**What goes wrong:** 라인 848~882의 useEffect는 schedules, templates, profile, hashtags, savedTexts를 한 번에 로드한다. 이 로직을 각 훅으로 분리하면 각 훅이 독립적으로 Supabase를 쿼리하게 돼 N개의 API 호출이 발생한다.
**Why it happens:** 현재 설계상 `user_data` 테이블이 전체 사용자 데이터를 하나의 row에 저장하는 구조.
**How to avoid:** Phase 1에서는 이 복합 useEffect를 한 곳에 유지한다 — `useSchedules` 훅 내에 두거나, 또는 `BloggerMasterApp`에 `useEffect` 자체는 남기고 각 setter만 훅에서 export받아 호출한다. Phase 2에서 Supabase 테이블 분리 시 이 문제가 자연히 해소된다.
**Warning signs:** build 후 로그인 시 데이터가 로드되지 않거나 여러 번 로드됨.

### Pitfall 2: 초기화 시점 의존성 (useState lazy initializer 내 JSON.parse)
**What goes wrong:** `useState(() => JSON.parse(...))` 패턴을 훅으로 옮길 때, 훅이 컴포넌트보다 늦게 실행되거나 초기값이 달라질 수 있다.
**Why it happens:** lazy initializer는 컴포넌트 마운트 전에 한 번만 실행되는데, 훅도 동일 시점에 실행되므로 문제없다. 단, `blogger_profile`을 여러 훅(useProfile + useGoogleCalendar)이 동시에 lazy initializer로 읽으면 두 번 파싱된다.
**How to avoid:** `blogger_profile` lazy initializer를 `useProfile`에만 두고, `gcalSelectedCal` 초기값은 `useProfile`의 반환값에서 가져오거나 별도 키(`gcal_selected_cal`)를 우선 참조한다. 라인 611 참조.
**Warning signs:** gcalSelectedCal 초기값이 profile보다 다른 값으로 세팅됨.

### Pitfall 3: templates 훅의 PLAN_LIMITS 의존성
**What goes wrong:** `useTemplates`가 `addTemplate()` 내부에서 `PLAN_LIMITS`, `userPlan`을 참조한다. 이 값들을 훅 인자로 받지 않으면 훅이 `userPlan` 상태에 접근할 방법이 없다.
**Why it happens:** 현재 모든 상태가 동일 컴포넌트에 있어 closure로 접근 가능하지만, 훅 분리 후에는 불가능.
**How to avoid:** `useTemplates(userPlan)` 형태로 인자 전달하거나, `addTemplate()` 대신 컴포넌트에서 플랜 제한 체크 후 훅의 `appendTemplate(newTemplate)`을 호출하는 방식으로 분리. 후자(책임 분리)가 더 깔끔하다.
**Warning signs:** ESLint `react-hooks/exhaustive-deps` 경고, 또는 플랜 제한 없이 템플릿이 추가됨.

### Pitfall 4: useGoogleCalendar의 URL hash 파싱 (side effect in initializer)
**What goes wrong:** `gcalToken`의 `useState` lazy initializer (라인 566~585)에서 `window.location.hash`를 파싱하고 localStorage 쓰기 + `window.history.replaceState()` 사이드이펙트를 실행한다. 이는 `useState` lazy initializer에서 side effect를 실행하는 안티패턴이다.
**Why it happens:** 기존 코드가 빠른 초기화를 위해 의도적으로 사용했지만, 훅 추출 시 이 패턴이 더 명시화되어 문제가 드러날 수 있다.
**How to avoid:** 훅 내부에서도 동일 패턴을 유지하거나 (동작에는 문제없음), `useEffect`로 옮기되 첫 render 전에 실행되도록 `useLayoutEffect`를 사용. Phase 1에서는 동작 유지를 우선하므로 기존 패턴 그대로 옮긴다.
**Warning signs:** Google Calendar 연동 후 토큰이 저장되지 않거나 URL hash가 남아있음.

### Pitfall 5: Zod strict vs passthrough 선택
**What goes wrong:** localStorage에 저장된 기존 데이터에 알 수 없는 필드가 있을 수 있다. Zod 기본값(`z.object()`)은 unknown 필드를 제거한다 (`strip` 모드). 저장-읽기 사이클에서 필드가 유실될 수 있다.
**Why it happens:** 향후 필드 추가/제거 시 기존 데이터와 스키마 불일치.
**How to avoid:** 모든 스키마에 `.passthrough()` 또는 `.strip()` 명시. Phase 1에서는 `.passthrough()`를 권장 — 알 수 없는 필드도 보존해 하위 호환 유지. Phase 2에서 Supabase로 이전 시 strict 모드 검토.
**Warning signs:** 저장 후 읽기 시 특정 필드가 사라짐.

### Pitfall 6: 상수 파일로 마이그레이션 후 import 순서
**What goes wrong:** `ADMIN_EMAILS`, `PLAN_LIMITS`를 `src/constants/admin.js`, `src/constants/plans.js`로 옮기면 BloggerMasterApp 상단의 인라인 선언을 제거해야 한다. 제거 전 import 추가를 빠뜨리면 ReferenceError.
**How to avoid:** 상수 이전 시 항상 (1) 새 파일에 export 추가 → (2) BloggerMasterApp에 import 추가 → (3) 기존 인라인 선언 삭제 순서 준수.

---

## Code Examples

### storageKeys.js 전체 내용

```javascript
// src/constants/storageKeys.js
// [VERIFIED: BloggerMasterApp.jsx 전체 localStorage 호출 분석]
export const STORAGE_KEYS = {
  // Profile
  PROFILE: 'blogger_profile',
  // Templates
  TEMPLATES: 'blogger_templates',
  FTC_TEMPLATES: 'blogger_ftc_templates',
  // Schedules
  SCHEDULES: 'blogSchedules',
  // Settings
  HASHTAGS: 'blogger_hashtags',
  SAVED_TEXTS: 'blogger_saved_texts',
  FONT_SIZE: 'blogger_font_size',
  THEME_COLOR: 'theme_color',
  LOCATION_PERM: 'location_perm',
  // Google Calendar
  GCAL_TOKEN: 'gcal_token',
  GCAL_TOKEN_EXPIRY: 'gcal_token_expiry',
  GCAL_REFRESH_TOKEN: 'gcal_refresh_token',
  GCAL_SELECTED_CAL: 'gcal_selected_cal',
  // Auth (biometric)
  BIOMETRIC_ENABLED: 'biometric_enabled',
  BIOMETRIC_CRED_ID: 'biometric_cred_id',
};
```

### plans.js + admin.js 상수 분리

```javascript
// src/constants/plans.js
export const PLAN_LIMITS = {
  schedule: { free: 5, standard: 20, pro: Infinity },
  template: { free: 2, standard: 4, pro: Infinity },
};

export const PLAN_META = {
  free:     { label: '무료',     color: 'bg-slate-100 text-slate-600',    desc: '협찬 월 5건 · 템플릿 2개' },
  standard: { label: '스탠다드', color: 'bg-sky-100 text-sky-700',         desc: '협찬 월 20건 · 템플릿 4개' },
  pro:      { label: '프로',     color: 'bg-gradient-to-r from-amber-400 to-orange-400 text-white', desc: '모든 기능 무제한' },
};

// src/constants/admin.js
export const ADMIN_EMAILS = ['hare_table@naver.com'];
```

### Zod 스키마 예시 (schedule)

```javascript
// src/features/schedule/schemas.js
import { z } from 'zod';

export const scheduleSchema = z.object({
  id: z.number(),
  brand: z.string().default('리뷰노트'),
  type: z.string().default('맛집'),
  title: z.string().default(''),
  address: z.string().optional().default(''),
  contact: z.string().optional().default(''),
  mission: z.string().optional().default(''),
  personalMission: z.string().optional().default(''),
  experiencePeriod: z.string().optional().default(''),
  deadline: z.string().optional().default(''),
  provided: z.string().optional().default(''),
  visitDays: z.string().optional().default(''),
  visitTime: z.string().optional().default(''),
  visitDate: z.string().optional().default(''),
  visitSetTime: z.string().optional().default(''),
  caution: z.string().optional().default(''),
  isDone: z.boolean().default(false),
  gcalEventId: z.string().optional().default(''),
  createdAt: z.string().optional(),
  platforms: z.array(z.string()).optional().default([]),
}).passthrough(); // 알 수 없는 필드 보존

export const schedulesArraySchema = z.array(scheduleSchema);
```

---

## Feature 폴더 마이그레이션 순서 (의존성 그래프 기반)

[VERIFIED: 코드베이스 의존성 직접 분석]

```
추출 순서 (안전한 순서):

1. src/constants/ 파일들 생성
   └── storageKeys.js, plans.js, admin.js
   └── BloggerMasterApp에서 import로 교체 (인라인 선언 제거)
   └── 빌드 확인

2. src/lib/parseWithSchema.js 생성
   └── 독립 유틸, 의존성 없음

3. src/features/settings/schemas.js + src/features/settings/hooks/useWeather.js
   └── 의존성: STORAGE_KEYS만 필요
   └── fontSize, themeColor, hashtags, location_perm 포함

4. src/features/profile/schemas.js + src/features/profile/hooks/useProfile.js
   └── 의존성: STORAGE_KEYS, parseWithSchema
   └── Supabase sync 콜백은 user prop 인자로 받기

5. src/features/template/schemas.js + src/features/template/hooks/useTemplates.js
   └── 의존성: STORAGE_KEYS, parseWithSchema, userPlan (인자)
   └── ftcTemplates도 동일 훅 내 포함

6. src/features/schedule/schemas.js + src/features/schedule/hooks/useSchedules.js
   └── 의존성: STORAGE_KEYS, parseWithSchema, gcalToken/gcalFunctions (인자)
   └── savedTexts도 포함 (Supabase sync 이펙트와 연관)

7. src/features/calendar/schemas.js + src/features/calendar/hooks/useGoogleCalendar.js
   └── 의존성: STORAGE_KEYS, parseWithSchema, VITE_GOOGLE_CLIENT_ID
   └── 마지막 — 다른 훅의 setter를 인자로 받을 가능성 있음

8. src/components/ui/ErrorBoundary.jsx 생성
   └── 독립 컴포넌트

9. ErrorBoundary 3곳 적용
   └── src/App.jsx 루트
   └── BloggerMasterApp 내 calendar 탭 (라인 2485)
   └── BloggerMasterApp 내 tool 탭 template 영역 (라인 2209)
```

**이유:** useWeather는 다른 도메인 상태를 전혀 참조하지 않아 가장 안전. useGoogleCalendar는 profile의 `gcalSelectedCal`을 참조하고 schedules의 `deleteSchedule`을 사용하므로 마지막에 추출.

---

## ErrorBoundary 3곳 JSX 삽입 지점

[VERIFIED: BloggerMasterApp.jsx 라인 분석]

| 위치 | 파일 | 현재 라인 | 감싸는 대상 |
|------|------|-----------|------------|
| 루트 | `src/App.jsx` | 전체 | `<BloggerMasterApp />` 전체 |
| Calendar | `BloggerMasterApp.jsx` | 라인 2485 | `{activeTab === 'calendar' && (...)}`의 내부 div |
| Templates | `BloggerMasterApp.jsx` | 라인 2209 | `{activeTab === 'tool' && (...)}`의 내부 div |

**Templates 영역 판단 근거:** Templates는 독립 탭이 없고 'tool' 탭 내 `editingTemplateId` 조건부 렌더링으로 존재한다. CONTEXT.md D-10에서 "Templates 영역"이라고 한 것은 tool 탭 또는 home 탭의 template 관련 섹션을 의미한다. 'tool' 탭 전체를 감싸는 것이 가장 안전한 해석.

---

## Environment Availability Audit

외부 의존성이 없는 순수 코드 구조 변경 작업이다. npm 설치만 필요.

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | npm install | ✓ | v22.22.0 | — |
| npm | 패키지 설치 | ✓ | v10.9.4 | — |
| react-error-boundary | INFRA-01 | 미설치 | — | 수동 클래스 컴포넌트 (권장 안 함) |
| zod | INFRA-02 | 미설치 | — | try-catch 유틸 (권장 안 함) |

**Missing dependencies with no fallback:**
- `react-error-boundary`, `zod` — 설치 명령: `npm install react-error-boundary zod`

---

## Validation Architecture

> nyquist_validation: false — 섹션 생략

**대신 기능 동등성 수동 검증 전략:**

Phase 1 완료 기준 (ROADMAP.md 성공 기준):
1. `npm run build` 에러 없이 통과
2. `npm run lint` 에러 없이 통과  
3. 브라우저에서 모든 탭(home, calendar, tool, profile, scheduleManage)이 기존과 동일하게 동작
4. localStorage 데이터가 리팩토링 전후 동일하게 유지 (개발자 도구 확인)
5. Calendar 탭에서 강제 에러 throw 시 앱 전체 크래시 없이 fallback UI 표시

**각 Wave 완료 후 체크리스트:**
- [ ] 앱이 정상 로드되는가
- [ ] 해당 도메인 CRUD가 동작하는가 (예: 템플릿 추가/수정/삭제)
- [ ] localStorage 키/값 형식이 변경되지 않았는가
- [ ] 콘솔에 예상치 못한 에러가 없는가

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 'tool' 탭이 Templates ErrorBoundary의 올바른 배치 위치 | ErrorBoundary 배치 지점 | 별도 탭이 있을 경우 위치 재조정 필요 |
| A2 | useSchedules에 savedTexts 포함 (Supabase sync 이펙트 연관) | 도메인 훅 경계 | settings 도메인이 더 적합할 수 있음 |
| A3 | Supabase 복합 useEffect를 useSchedules에 귀속 (Phase 1) | Common Pitfall #1 | 다른 훅이 더 적합한 소유자일 수 있음 |

---

## Open Questions

1. **Supabase 복합 로드 이펙트 소유자**
   - What we know: 라인 848~882의 useEffect는 schedules/templates/profile/hashtags/savedTexts를 모두 로드
   - What's unclear: 어느 훅이 이 이펙트를 소유해야 하는가
   - Recommendation: `useSchedules`에 넣되, 다른 도메인 setter들을 인자로 받는다. Phase 2에서 각 테이블로 분리되면 자연히 해소.

2. **settings 도메인 분리 범위**
   - What we know: fontSize, themeColor, hashtags는 논리적으로 settings 도메인
   - What's unclear: savedTexts, userPlan도 settings인가, 아니면 각각 별도인가
   - Recommendation: `savedTexts`는 schedule/tool 탭에서 사용되므로 `useSchedules`에 포함. `userPlan`/`isAdmin`은 Supabase에서 오는 값이므로 settings 훅이 아닌 별도 `useUserPlan` 훅 또는 BloggerMasterApp에 유지.

---

## Sources

### Primary (HIGH confidence)
- `src/BloggerMasterApp.jsx` 직접 분석 — JSON.parse 위치, localStorage 키, useState 매핑
- `src/hooks/useAuth.js` 직접 분석 — 훅 패턴 참조
- npm registry (직접 조회) — react-error-boundary@6.1.1, zod@4.3.6 버전 및 peer deps 확인

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONCERNS.md` — JSON.parse 위치 라인 힌트 (CONCERNS.md 라인 62에 명시)
- `.planning/codebase/ARCHITECTURE.md` — 데이터 흐름 패턴 확인
- react-error-boundary peerDependencies: `react: '^18.0.0 || ^19.0.0'` — npm view로 확인

### Tertiary (LOW confidence)
- 없음

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md의 모든 actionable 지시사항 — 플래너가 준수를 확인해야 함:

| 제약 | 내용 |
|------|------|
| 언어 스택 | React 19 + Vite + Tailwind CSS 유지 — 변경 불가 |
| 백엔드 | Supabase + Vercel Serverless Functions 유지 |
| 기능 동등성 | 리팩토링 전후 UX 동일 |
| 코드 스타일 | 2 space indent, single quotes, no Prettier |
| 컴포넌트 네이밍 | PascalCase 파일/컴포넌트, camelCase 훅 (`use` prefix) |
| import 순서 | React → 서드파티 → 아이콘 → 로컬훅 → 로컬컴포넌트 → 유틸 |
| 스타일 | Tailwind 유틸리티 인라인, 커스텀 CSS는 `src/index.css`에만 |
| 에러 메시지 | 한국어, `console.error`/`console.warn` 사용 |
| 모듈 export | 훅은 named export (`export function useXxx`), 컴포넌트는 default export 권장 |
| API 라우트 | `api/` 디렉토리 유지, kebab-case 파일명 |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry 직접 확인, React 19 호환 peer deps 검증
- Architecture: HIGH — BloggerMasterApp.jsx 라인별 직접 분석
- Pitfalls: HIGH — 실제 코드 패턴에서 도출, 가정 최소화

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30일 — 안정적 스택)

---

## RESEARCH COMPLETE
