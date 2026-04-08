# Roadmap: Blue Review — 구조 리팩토링

## Overview

4,243줄 단일 컴포넌트를 기능별 레이어로 분리하고 localStorage 데이터를 Supabase DB로 이전한다. 사용자가 느끼는 동작은 전혀 바뀌지 않아야 한다. 작업 순서는 기술적 의존성(인프라 → 데이터 → 컴포넌트 → 검증)을 따른다.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - 라이브러리, 상수, 에러 바운더리, 폴더 구조, 도메인 훅 추출
- [ ] **Phase 2: Data Layer + Security** - Supabase DB 테이블, 마이그레이션 브릿지, TanStack Query, 보안 하드닝
- [ ] **Phase 3: Component Decomposition** - Screen 분리, BloggerShell 도입, 모노리스 삭제
- [ ] **Phase 4: Parity Verification** - 전기능 동작 검증, 마이그레이션 확인, 배포

## Phase Details

### Phase 1: Foundation
**Goal**: 리팩토링을 안전하게 진행할 수 있는 인프라가 갖춰진다 — 라이브러리 설치, 상수 파일, 에러 경계, feature 폴더 구조, 도메인별 커스텀 훅
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, STATE-01, STATE-02
**Success Criteria** (what must be TRUE):
  1. 앱이 기존과 동일하게 로드되고 모든 탭이 동작한다
  2. 에러 경계가 Calendar/Templates에서 에러 발생 시 앱 전체 크래시 없이 에러 UI를 표시한다
  3. src/constants/storageKeys.js가 존재하고 모든 localStorage 키가 이 파일에서만 참조된다
  4. src/features/ 폴더 구조가 생성되어 있다
  5. 도메인 훅(useSchedules, useTemplates, useProfile, useWeather, useGoogleCalendar 등)이 각자의 상태와 사이드이펙트를 소유한다
**Plans**: 6 plans
Plans:
- [x] 01-01-setup-constants-PLAN.md — 라이브러리 설치, feature/ui 폴더 구조, 상수 추출
- [ ] 01-02-safe-parser-PLAN.md — parseWithSchema 유틸 + 5 도메인 schemas + 9개 JSON.parse 교체
- [ ] 01-03-error-boundary-PLAN.md — ErrorBoundary 컴포넌트 + 3곳 적용
- [ ] 01-04-hooks-weather-profile-PLAN.md — useWeather, useProfile 훅 추출
- [ ] 01-05-hooks-templates-schedules-PLAN.md — useTemplates, useSchedules 훅 추출
- [ ] 01-06-hooks-gcal-cleanup-PLAN.md — useGoogleCalendar 훅 + 코드 정리 + Phase 1 회귀 UAT


### Phase 2: Data Layer + Security
**Goal**: Supabase DB가 유일한 영속 저장소가 되고, 기존 사용자 데이터가 유실 없이 이전되며, 보안 취약점이 해소된다
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):
  1. 새 기기(또는 localStorage 초기화 후)에 로그인하면 기존 스케줄·템플릿 데이터가 그대로 표시된다
  2. 기존 사용자가 로그인하면 localStorage 데이터가 자동으로 Supabase로 이전된다 (데이터 유실 없음)
  3. Google Calendar 토큰이 localStorage나 URL hash에 평문으로 남지 않는다
  4. 관리자 이메일이 소스 코드에 하드코딩되어 있지 않다
  5. 스케줄/템플릿 CRUD 후 window.location.reload() 없이 화면이 갱신된다
**Plans**: TBD
**UI hint**: yes

### Phase 3: Component Decomposition
**Goal**: BloggerMasterApp.jsx가 삭제되고 기능별 Screen 컴포넌트와 BloggerShell로 대체된다
**Depends on**: Phase 2
**Requirements**: COMP-01, COMP-02, COMP-03
**Success Criteria** (what must be TRUE):
  1. src/BloggerMasterApp.jsx 파일이 존재하지 않는다
  2. BloggerShell이 라우팅/레이아웃/네비게이션만 담당하고 비즈니스 로직이 없다
  3. 각 탭(Home, Schedule, Calendar, Tools, Profile)이 독립 Screen 컴포넌트로 렌더링된다
  4. 인라인 정의된 서브컴포넌트(PasswordResetScreen, BiometricLockScreen 등)가 별도 파일로 분리되어 있다
**Plans**: TBD
**UI hint**: yes

### Phase 4: Parity Verification
**Goal**: 리팩토링 전후 모든 사용자 기능이 동일하게 동작함이 수동 검증으로 확인된다
**Depends on**: Phase 3
**Requirements**: PAR-01, PAR-02
**Success Criteria** (what must be TRUE):
  1. 이메일/비밀번호 회원가입, 로그인, 비밀번호 재설정이 정상 동작한다
  2. Google/Kakao OAuth 로그인, 생체인증 잠금이 정상 동작한다
  3. 스케줄 CRUD·드래그 정렬, 템플릿 관리, Google Calendar 동기화가 정상 동작한다
  4. 이미지 내보내기(html2canvas), 날씨·위치 정보 표시가 정상 동작한다
  5. blue-review.com에 배포 후 Vercel 환경에서 전항목이 동작한다
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/TBD | Not started | - |
| 2. Data Layer + Security | 0/TBD | Not started | - |
| 3. Component Decomposition | 0/TBD | Not started | - |
| 4. Parity Verification | 0/TBD | Not started | - |
