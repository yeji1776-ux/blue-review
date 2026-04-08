# Phase 1: Foundation - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

리팩토링을 안전하게 진행할 수 있는 인프라를 구축한다 — 라이브러리 설치, 상수 추출, 에러 바운더리, feature 폴더 구조, 도메인별 커스텀 훅 추출. 데이터 영속성(Supabase 이전), Screen 분리, 보안 하드닝은 이후 Phase 담당.

</domain>

<decisions>
## Implementation Decisions

### Feature 폴더 구조
- **D-01:** `src/features/` 아래 기능별로 완전 분리 — `schedule/`, `template/`, `calendar/`, `profile/`, `settings/` 5개 feature
- **D-02:** 각 feature 폴더 내부에 `components/`, `hooks/`, `services/`, `constants/` 하위 폴더 구성 (Phase 1에서는 일부 비어 있을 수 있음)
- **D-03:** 공통 UI 컴포넌트(ErrorBoundary, Card, Button 등)는 기존 `src/components/` 아래 `ui/` 하위 폴더로 분리 — feature 간 공유 자산

### 커스텀 훅 경계
- **D-04:** 5개 핵심 도메인 훅으로 분리 — `useSchedules`, `useTemplates`, `useProfile`, `useGoogleCalendar`, `useWeather`
- **D-05:** 각 훅은 해당 도메인의 상태와 사이드이펙트(localStorage 읽기/쓰기, 동기화)를 완전히 소유 (REQUIREMENTS STATE-02)
- **D-06:** Phase 1에서 훅은 기존 localStorage 로직을 그대로 내부로 캡슐화 — service 레이어 추상화는 Phase 2에서 도입. 리팩토링 범위가 한 번에 너무 커지지 않도록 단계별 진행
- **D-07:** UI 로컬 상태(탭 선택, 모달 열림 등)는 훅이 아니라 Screen 컴포넌트(또는 Phase 3 이후 컴포넌트) 자체에 유지

### 에러 바운더리 UX
- **D-08:** fallback UI는 해당 영역만 대체하는 인라인 경량 UI — 에러 메시지 + 다시 시도 버튼. 앱 나머지 기능은 정상 동작 유지
- **D-09:** fallback 디자인은 기존 `jelly-card`/`sky-*` 팔레트와 톤 맞춤, 한국어 메시지
- **D-10:** 적용 범위는 3곳 — 최상위 App 루트, Calendar 영역, Templates 영역 (REQUIREMENTS INFRA-01). Screen별 세분화는 Phase 3에서 Screen 분리와 함께 진행
- **D-11:** 에러 로깅은 `console.error`로 기본 기록 — 원격 로깅은 이번 마일스톤 out of scope

### Zod 검증 전략
- **D-12:** JSON.parse 실패 시 안전한 기본값(빈 배열 또는 기본 객체) 반환 + `console.warn`으로 경고. 사용자는 손실 없이 계속 사용 가능 (REQUIREMENTS INFRA-02)
- **D-13:** Zod 스키마는 feature별로 정의 — `src/features/{domain}/schemas.js`. Phase 2에서 Supabase 이전 시 동일 스키마 재사용
- **D-14:** 기존 9개 `JSON.parse` 호출을 하나씩 안전 파서 유틸(`parseWithSchema` 등)로 교체 — Phase 1 검증 가능한 명확한 작업 단위

### Claude's Discretion
- ErrorBoundary 컴포넌트의 정확한 JSX/Tailwind 마크업
- Zod 스키마의 필드별 세부 타입 정의 (optional/nullable 결정)
- 상수 파일 이름 외 내부 그룹핑 방식 (`storageKeys.js`, `plans.js`, `admin.js` 등 분할 여부)
- 각 도메인 훅의 내부 API 형태 (반환 객체 키 이름)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 프로젝트 전반
- `.planning/PROJECT.md` — Core value (기능 동등성), Constraints (React 19 + Vite + Tailwind 유지), Out of Scope
- `.planning/REQUIREMENTS.md` — v1 요구사항 및 Phase 1 트레이서빌리티 (INFRA-01~04, STATE-01~02)
- `.planning/ROADMAP.md` §Phase 1 — Goal, Success Criteria, 의존성

### 코드베이스 분석
- `.planning/codebase/ARCHITECTURE.md` — 현재 모놀리식 SPA 구조, 데이터 흐름
- `.planning/codebase/STRUCTURE.md` — 현재 디렉토리 레이아웃, 새 코드 배치 가이드
- `.planning/codebase/CONVENTIONS.md` — 네이밍 규칙, import 순서, 스타일 패턴
- `.planning/codebase/CONCERNS.md` — 4,243줄 모놀리스 및 50+ useState 문제

[기존 프로젝트에 외부 ADR/spec 문서는 없음 — 위 .planning 문서가 유일한 canonical reference]

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useAuth.js` — 이미 존재하는 유일한 커스텀 훅. 새 도메인 훅들의 작성 패턴 참고 기준
- `src/lib/supabase.js` — Supabase 클라이언트 싱글톤. Phase 2에서 service 레이어가 사용
- `src/components/LoginPage.jsx` — 이미 분리되어 있는 유일한 별도 컴포넌트. `translateError()` 패턴은 에러 바운더리 메시지 톤에 참고
- `src/index.css`의 `.jelly-card`, `.glass-card` 등 — ErrorBoundary fallback UI 디자인에 재사용

### Established Patterns
- Supabase 응답은 `{ data, error }` 구조 — 새 service/훅도 동일 패턴 유지
- Tailwind 유틸리티 클래스 인라인 사용, 커스텀 CSS는 `src/index.css`에만
- Import 순서: React → 서드파티 → 아이콘 → 로컬 훅 → 로컬 컴포넌트 → 로컬 유틸
- 에러 메시지는 한국어, 콘솔 로깅은 영문 prefix + 한국어 설명 혼용

### Integration Points
- `src/BloggerMasterApp.jsx` (4,243줄) — Phase 1에서는 **파일 내부**에서 상태/로직을 새 훅 호출로 교체. 파일 분해 자체는 Phase 3
- `src/App.jsx` — 최상위 ErrorBoundary가 추가될 위치
- 현재 `src/features/`, `src/constants/`, `src/services/`, `src/components/ui/`, `src/hooks/` (추가 훅) 디렉토리 없음 — Phase 1에서 전부 생성

</code_context>

<specifics>
## Specific Ideas

- "사용자가 느끼는 동작은 전혀 바뀌지 않아야 한다" — Phase 1 검증 기준의 핵심. 새 훅으로 교체 후에도 기존 localStorage 키와 데이터 형식 유지 필수
- 리팩토링 범위를 단계적으로 끊는 선호 — Phase 1은 "구조만 세팅 + 훅 추출", service 추상화는 Phase 2로 미룸
- 에러 바운더리 fallback UI는 기존 jelly 디자인 언어와 어색하지 않게

</specifics>

<deferred>
## Deferred Ideas

- Service 레이어 추상화 (`scheduleService` 등) — Phase 2에서 Supabase 이전과 함께
- Screen 분리 및 BloggerMasterApp 해체 — Phase 3
- 모든 Screen에 에러 바운더리 세분화 — Phase 3 (Screen 분리 이후 자연스러움)
- 원격 에러 로깅/모니터링 — 마일스톤 out of scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-09*
