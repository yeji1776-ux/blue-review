# Requirements: Blue Review — 구조 리팩토링

**Defined:** 2026-04-06
**Core Value:** 사용자가 느끼는 동작은 전혀 바뀌지 않으면서, 코드를 유지보수·확장 가능한 구조로 만든다.

## v1 Requirements

### Infrastructure

- [ ] **INFRA-01**: 앱 전체와 주요 기능(Calendar, Templates)에 React Error Boundary 적용
- [ ] **INFRA-02**: 9개 JSON.parse 호출에 Zod v4 스키마 검증 적용, 파싱 실패 시 안전한 기본값 반환
- [x] **INFRA-03**: 매직 스트링(탭명, 플랜 제한, 관리자 이메일)을 src/constants/로 추출
- [x] **INFRA-04**: Feature 기반 폴더 구조 적용 (src/features/{schedule,template,calendar,profile,settings}/)

### State Management

- [ ] **STATE-01**: BloggerMasterApp의 50+ useState를 도메인별 커스텀 훅으로 추출 (useSchedules, useTemplates, useProfile, useWeather, useGoogleCalendar 등)
- [ ] **STATE-02**: 각 커스텀 훅이 자신의 상태와 사이드이펙트를 완전히 소유

### Data Layer

- [ ] **DATA-01**: Supabase DB에 schedules, templates, ftc_templates, user_profiles 테이블 생성 (RLS 정책 포함)
- [ ] **DATA-02**: localStorage 데이터를 Supabase DB로 마이그레이션 (기존 사용자 데이터 유실 없는 마이그레이션 브릿지)
- [ ] **DATA-03**: src/services/ 레이어에 도메인별 CRUD 함수 분리 (scheduleService, templateService 등)
- [ ] **DATA-04**: TanStack Query v5 도입 — 자동 캐싱, 리페치, 로딩/에러 상태 관리
- [ ] **DATA-05**: window.location.reload() 대신 invalidateQueries로 선택적 데이터 갱신

### Component Architecture

- [ ] **COMP-01**: BloggerMasterApp.jsx(4,243줄)을 기능별 Screen 컴포넌트로 분리
- [ ] **COMP-02**: 인라인 정의된 서브컴포넌트(PasswordResetScreen, BiometricLockScreen, SortableTemplateItem 등)를 별도 파일로 이동
- [ ] **COMP-03**: 분리 후 BloggerMasterApp이 Shell 역할만 수행 (라우팅/레이아웃/네비게이션)

### Security

- [ ] **SEC-01**: Google Calendar 토큰을 URL hash/localStorage 대신 Supabase DB에 암호화 저장
- [ ] **SEC-02**: URL hash 읽은 후 즉시 window.history.replaceState로 정리
- [ ] **SEC-03**: API 호출 전 토큰 만료 사전 체크 + 자동 갱신
- [ ] **SEC-04**: 하드코딩된 관리자 이메일을 Supabase user_roles 테이블로 이전

### Parity

- [ ] **PAR-01**: 리팩토링 전후 모든 기능이 동일하게 동작 (기능 동등성 검증)
- [ ] **PAR-02**: 기존 localStorage 사용자의 데이터가 Supabase로 자동 마이그레이션됨

## v2 Requirements

### Testing

- **TEST-01**: 주요 기능별 통합 테스트 작성
- **TEST-02**: 인증 플로우 E2E 테스트

### TypeScript

- **TS-01**: JSX → TSX 마이그레이션
- **TS-02**: 전체 타입 정의 추가

### Performance

- **PERF-01**: React.memo / useCallback 최적화
- **PERF-02**: 대규모 리스트 가상화 (react-window)

### i18n

- **I18N-01**: 다국어 지원 (한국어 하드코딩 → i18n 라이브러리)

## Out of Scope

| Feature | Reason |
|---------|--------|
| UI/디자인 변경 | 별도로 Gemini를 활용해 진행 예정. 구조 변경과 UI 변경 혼합 시 회귀 테스트 불가 |
| 새로운 기능 추가 | 구조 개선 완료 후 다음 마일스톤에서. 기능 동등성이 이번 마일스톤 성공 기준 |
| TypeScript 전환 | 구조 리팩토링과 동시에 진행 시 diff가 2배로 커짐. 별도 마일스톤으로 |
| 테스트 코드 작성 | 리팩토링 중 작성하면 구조 변경마다 테스트도 수정해야 함. 구조 안정 후 별도 진행 |
| Service Worker / 오프라인 | 현재 오프라인 요구사항 없음. 아키텍처 결정이 필요한 별도 작업 |
| 리스트 가상화 | 블로거 규모에서 성능 문제 미입증. 프로파일링 후 필요시 추가 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| STATE-01 | Phase 1 | Pending |
| STATE-02 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| DATA-05 | Phase 2 | Pending |
| SEC-01 | Phase 2 | Pending |
| SEC-02 | Phase 2 | Pending |
| SEC-03 | Phase 2 | Pending |
| SEC-04 | Phase 2 | Pending |
| COMP-01 | Phase 3 | Pending |
| COMP-02 | Phase 3 | Pending |
| COMP-03 | Phase 3 | Pending |
| PAR-01 | Phase 4 | Pending |
| PAR-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-06 after roadmap creation*
