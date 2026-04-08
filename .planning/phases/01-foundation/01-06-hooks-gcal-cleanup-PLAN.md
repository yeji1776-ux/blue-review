---
phase: 01-foundation
plan: 06
type: execute
wave: 4
depends_on: [05]
files_modified:
  - src/features/calendar/hooks/useGoogleCalendar.js
  - src/BloggerMasterApp.jsx
autonomous: false
requirements: [STATE-01, STATE-02, INFRA-04]
must_haves:
  truths:
    - "useGoogleCalendar 훅이 gcalToken/gcalCalendars/gcalSelectedCal 상태와 OAuth/refresh/sync 함수를 모두 소유한다"
    - "URL hash 토큰 파싱 + replaceState 정리 동작이 훅 안에서 유지된다"
    - "Google Calendar 키 4개(gcal_token, gcal_token_expiry, gcal_refresh_token, gcal_selected_cal) 형태가 변경되지 않는다"
    - "BloggerMasterApp.jsx 라인 수가 phase 시작 대비 최소 400줄 이상 감소한다"
    - "사용되지 않는 import/dead code/잘못된 import 순서가 정리된다"
    - "Phase 1 모든 success criteria가 충족되어 ROADMAP §Phase 1 검증을 통과한다"
  artifacts:
    - path: "src/features/calendar/hooks/useGoogleCalendar.js"
      provides: "useGoogleCalendar 훅"
      exports: ["useGoogleCalendar"]
      min_lines: 80
  key_links:
    - from: "src/BloggerMasterApp.jsx"
      to: "src/features/calendar/hooks/useGoogleCalendar.js"
      via: "useGoogleCalendar() 호출"
      pattern: "useGoogleCalendar\\("
---

<objective>
Phase 1 마지막 도메인 훅 추출(useGoogleCalendar) + 코드 정리(INFRA-04 마무리).

Purpose: 5개 도메인 훅 추출을 완료하고, Phase 1 인프라가 ROADMAP success criteria를 모두 충족하도록 한다. URL hash 사이드이펙트(Pitfall 4)를 안전하게 옮긴다.
Output: useGoogleCalendar 훅 + BloggerMasterApp 정리 + Phase 1 최종 수동 검증.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation/01-RESEARCH.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@CLAUDE.md
@src/BloggerMasterApp.jsx
@src/features/calendar/schemas.js
@src/features/profile/hooks/useProfile.js
@src/lib/parseWithSchema.js
@src/constants/storageKeys.js

<interfaces>
useGoogleCalendar 도메인 (RESEARCH 라인 384~391, BloggerMasterApp 라인 543~707):
- state:
  - gcalToken (565) — lazy initializer가 URL hash 파싱 + localStorage 쓰기 + history.replaceState (Pitfall 4)
  - gcalConnecting (586)
  - gcalCalendars (609)
  - gcalSelectedCal (610) — 라인 611의 JSON.parse #5
- effects:
  - 라인 588: token needs_refresh 처리
  - 라인 636: 캘린더 목록 fetch (라인 647 JSON.parse #6)
- functions: refreshGcalToken, connectGoogleCalendar, disconnectGoogleCalendar, getValidGcalToken, syncToGoogleCalendar, deleteFromGoogleCalendar
- localStorage: gcal_token, gcal_token_expiry, gcal_refresh_token, gcal_selected_cal

**Pitfall 4 (RESEARCH 라인 434~438):** useState lazy initializer 안의 사이드이펙트(URL hash 파싱 + history.replaceState). 동작 보존을 위해 그대로 옮긴다 (Phase 2 SEC-02에서 별도 정리).

**Pitfall 2 (RESEARCH 라인 422~426):** gcalSelectedCal 초기값을 useProfile과 중복 파싱하지 않도록, useGoogleCalendar는 `gcal_selected_cal` 키를 우선 참조하고, fallback으로 'primary' 사용. profile 객체의 gcalSelectedCal 필드는 여기서 읽지 않는다 (이미 Plan 4 useProfile이 소유).

**의존성:** syncToGoogleCalendar/deleteFromGoogleCalendar는 schedules를 인자로 받거나 호출 시점에 schedules를 받아 처리. 직접 schedules state에 접근하지 않도록 인자 기반 API로 분리.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: useGoogleCalendar 훅 작성 + BloggerMasterApp 교체</name>
  <read_first>
    - src/BloggerMasterApp.jsx 라인 543~707 전체 (gcal 블록)
    - src/features/calendar/schemas.js
    - .planning/phases/01-foundation/01-RESEARCH.md (라인 384~391, 422~438)
  </read_first>
  <files>
    src/features/calendar/hooks/useGoogleCalendar.js,
    src/BloggerMasterApp.jsx
  </files>
  <action>
    1. src/features/calendar/hooks/useGoogleCalendar.js 작성:
       - imports: useState, useEffect, STORAGE_KEYS
       - state:
         - `gcalToken`: lazy initializer로 (a) URL hash에서 access_token 파싱 → 있으면 localStorage에 저장 + history.replaceState로 hash 정리 + 토큰 반환, (b) 없으면 localStorage.getItem(STORAGE_KEYS.GCAL_TOKEN) 반환. **BloggerMasterApp 라인 565~585 코드를 그대로 옮긴다** (Pitfall 4 — 동작 보존).
         - `gcalConnecting` boolean
         - `gcalCalendars` 배열
         - `gcalSelectedCal`: lazy init → `localStorage.getItem(STORAGE_KEYS.GCAL_SELECTED_CAL) || 'primary'` (Pitfall 2 — profile 객체 참조하지 않음)
       - useEffect 1 (588): token needs_refresh 처리 — 라인 588~635 그대로
       - useEffect 2 (636): 캘린더 목록 fetch — 라인 636~705 그대로 (단, 라인 647의 JSON.parse는 Plan 2에서 이미 처리되었거나 여기서 직접 try/catch + 'primary' fallback)
       - functions (BloggerMasterApp 라인별 본체 그대로 옮김):
         - `refreshGcalToken()`
         - `connectGoogleCalendar()`
         - `disconnectGoogleCalendar()`: gcal 4개 키 모두 localStorage.removeItem
         - `getValidGcalToken()`
         - `syncToGoogleCalendar(schedule)` — 단일 schedule 인자
         - `deleteFromGoogleCalendar(eventId)` — eventId 인자
         - `selectCalendar(calId)`: setGcalSelectedCal + localStorage.setItem(STORAGE_KEYS.GCAL_SELECTED_CAL, calId)
       - return: `{ gcalToken, gcalConnecting, gcalCalendars, gcalSelectedCal, setGcalSelectedCal: selectCalendar, refreshGcalToken, connectGoogleCalendar, disconnectGoogleCalendar, getValidGcalToken, syncToGoogleCalendar, deleteFromGoogleCalendar }`

    2. BloggerMasterApp.jsx 교체:
       - import 추가
       - 컴포넌트 본문 destructure 호출
       - 기존 gcalToken/gcalConnecting/gcalCalendars/gcalSelectedCal useState 제거
       - 기존 두 useEffect (588, 636) 제거
       - 기존 6개 함수 본체 제거
       - 호출부는 그대로 동작 (이름 동일)
       - profile 객체의 gcalSelectedCal 필드 참조가 있다면 useGoogleCalendar의 gcalSelectedCal 사용으로 변경 (라인 611 위치)

    3. **CRITICAL 동등성**:
       - 4개 키 값 변경 금지
       - URL hash 파싱 동작 유지 (OAuth 콜백 후 토큰이 localStorage에 저장되어야 함)
       - history.replaceState로 hash 정리 동작 유지
       - syncToGoogleCalendar API 시그니처 변경 시 호출부도 함께 수정해 회귀 없도록
  </action>
  <verify>
    <automated>npm run build &amp;&amp; npm run lint</automated>
  </verify>
  <acceptance_criteria>
    - useGoogleCalendar.js 80줄 이상
    - BloggerMasterApp에서 4개 gcal useState, 2개 gcal useEffect, 6개 gcal 함수 본체 모두 제거
    - URL hash 파싱 + replaceState 코드가 훅 lazy initializer에 보존
    - npm run build, npm run lint 통과
    - 4개 localStorage 키 값 변경 없음
  </acceptance_criteria>
  <done>useGoogleCalendar 추출 완료, OAuth 흐름 보존, 빌드/린트 통과.</done>
</task>

<task type="auto">
  <name>Task 2: BloggerMasterApp 정리 (사용 안 된 import, 정렬, dead code)</name>
  <read_first>
    - src/BloggerMasterApp.jsx 상단 import 블록
    - .planning/codebase/CONVENTIONS.md (import 순서 가이드)
  </read_first>
  <files>src/BloggerMasterApp.jsx</files>
  <action>
    1. **사용되지 않는 import 제거**: Plan 1~6에서 함수/state가 훅으로 이동하면서 더 이상 직접 사용하지 않는 import가 생겼을 수 있음. ESLint `no-unused-vars` 경고를 바탕으로 제거. 특히 zod, parseWithSchema, schemas는 이제 훅 안에서만 사용되므로 BloggerMasterApp에서는 import 불필요.

    2. **import 순서 정리** (CONVENTIONS.md per): React → 서드파티 → 아이콘(lucide-react) → 로컬 hooks → 로컬 components → 로컬 features 훅 → 로컬 lib/constants

    3. **dead code 제거**: 훅 추출 후 남은 빈 useEffect, 사용되지 않는 helper 함수, 주석 처리된 구 코드 제거. **단, 동작에 영향을 주는 코드는 절대 제거 금지** — 의심스러우면 남긴다.

    4. **CRITICAL 금지사항**:
       - 로직 변경 금지 (정렬과 unused 제거만)
       - JSX 변경 금지
       - localStorage 호출 변경 금지
       - Supabase 복합 useEffect(라인 848~882, 885) 절대 손대지 않음
  </action>
  <verify>
    <automated>npm run build &amp;&amp; npm run lint</automated>
  </verify>
  <acceptance_criteria>
    - npm run lint 경고가 phase 시작 baseline 이하 (특히 no-unused-vars 0개 목표)
    - import 순서가 CONVENTIONS.md 가이드 준수
    - BloggerMasterApp.jsx 총 라인 수가 phase 시작 대비 400줄 이상 감소
    - npm run build 통과
  </acceptance_criteria>
  <done>코드 정리 완료, 린트 경고 최소화.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Checkpoint: Phase 1 최종 회귀 UAT</name>
  <what-built>
    - 5개 도메인 훅 추출 완료 (useWeather, useProfile, useTemplates, useSchedules, useGoogleCalendar)
    - BloggerMasterApp.jsx ~400줄 이상 감소
    - INFRA-01~04, STATE-01~02 모두 충족
  </what-built>
  <how-to-verify>
    `npm run dev` 후 다음 전체 회귀 시나리오 수행. 각 항목은 리팩토링 전과 동일하게 동작해야 함:

    **인증**:
    1. 이메일/비밀번호 회원가입 → 가입 완료, 자동 로그인
    2. 로그아웃 후 이메일/비밀번호 로그인
    3. 비밀번호 찾기 이메일 발송 (Supabase)
    4. (선택) Google OAuth, Kakao OAuth 로그인
    5. (선택) 생체인증 등록 + 잠금 해제

    **Profile**:
    6. profile 탭 → 닉네임/블로그 URL 수정 → 저장 → 새로고침 후 유지
    7. 플랫폼 활성화 토글 → 저장 → 유지
    8. profileSubTab 'basic' ↔ 'platform' 전환 정상

    **Templates**:
    9. tool 탭 → 협찬 신청 문구 추가/수정/삭제
    10. FTC 문구 추가/수정/삭제
    11. 드래그로 순서 변경 → 새로고침 후 순서 유지
    12. 무료 플랜 한도 초과 시 업그레이드 모달

    **Schedules**:
    13. home/schedule 탭 → 스케줄 추가/수정/삭제
    14. Gemini 스마트 파싱
    15. 저장된 글(savedTexts) 추가/삭제
    16. 이미지 내보내기(html2canvas)

    **Calendar**:
    17. Google Calendar 연결 (OAuth 흐름)
    18. 캘린더 목록 표시 + 선택
    19. 스케줄을 Google Calendar에 동기화
    20. 동기화된 이벤트 삭제
    21. 토큰 만료 후 자동 refresh

    **Settings**:
    22. 폰트 크기 변경 → 유지
    23. 테마 색상 변경 → 유지
    24. 위치 권한 + 날씨 표시

    **ErrorBoundary**:
    25. (개발자 도구) Calendar 탭에 임의 에러 throw → fallback UI만 표시, 다른 탭 정상

    **Supabase 동기화**:
    26. 스케줄 추가 후 1.5초 대기 → Supabase user_data 테이블 upsert 확인
    27. 다른 기기/시크릿 모드에서 동일 계정 로그인 → 최신 데이터 표시

    **localStorage 키 무결성**:
    28. DevTools Application → Local Storage에서 다음 키들이 모두 기존과 동일한 형태로 존재:
        - blogger_profile, blogger_templates, blogger_ftc_templates, blogger_hashtags, blogger_saved_texts
        - blogSchedules
        - blogger_font_size, theme_color, location_perm
        - gcal_token, gcal_token_expiry, gcal_refresh_token, gcal_selected_cal
        - biometric_enabled, biometric_cred_id
    29. 키 값 string 형태가 변경되지 않았는지 (이전 데이터로도 정상 로드)

    **Build sanity**:
    30. `npm run build` exit 0
    31. `npm run lint` 경고 수가 phase 시작 시점 이하
  </how-to-verify>
  <resume-signal>"approved" 또는 발견된 회귀 항목 설명</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Google OAuth callback URL hash → app | URL hash에 access_token이 노출됨. 현재 동작은 즉시 localStorage로 옮기고 history.replaceState로 정리. Phase 2 SEC-01/SEC-02에서 httpOnly 쿠키로 이전 예정. |
| Google Calendar API → app | 외부 API 응답. 캘린더 목록은 신뢰. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-06-01 | Information Disclosure | URL hash에 OAuth access_token 노출 | accept | Phase 1 동작 동등성. SEC-02(Phase 2)에서 정리 예정. 이 plan은 기존 history.replaceState 동작 보존. |
| T-01-06-02 | Information Disclosure | localStorage에 OAuth 토큰 평문 저장 | accept | Phase 1 동작 동등성. SEC-01(Phase 2)에서 Supabase DB 암호화 저장으로 이전. |
| T-01-06-03 | Tampering | 잘못된 import 정리로 동작 회귀 | mitigate | Task 2의 정리 작업은 unused import + 정렬만 허용. 로직/JSX 변경 금지. Task 3 회귀 UAT가 31개 시나리오로 검증. |
| T-01-06-04 | DoS | gcal token refresh 실패 시 무한 루프 | mitigate | refreshGcalToken 본문을 그대로 옮김 — 기존 동작 보존. UAT 21번에서 검증. |
</threat_model>

<verification>
- npm run build, npm run lint 통과
- BloggerMasterApp.jsx 라인 수 감소 누적 ≥ 400줄 (phase 시작 대비)
- 5개 도메인 훅 모두 src/features/*/hooks/ 아래 존재
- 31개 회귀 UAT 항목 모두 통과
- 16개 localStorage 키 형태 모두 동일 (git diff 또는 DevTools 확인)
- ROADMAP §Phase 1 success criteria 5개 모두 충족
</verification>

<success_criteria>
- STATE-01 완전 충족: 5개 도메인 훅 모두 추출
- STATE-02 충족: 각 훅이 자신의 상태와 사이드이펙트(Supabase 복합 useEffect 제외 — Pitfall 1 의도된 결정) 소유
- INFRA-04 충족 마무리: feature 폴더 구조 + import 정리 + dead code 제거
- ROADMAP §Phase 1 5개 success criteria 전부 만족:
  1. ✓ 앱이 동일하게 로드되고 모든 탭 동작 (UAT)
  2. ✓ ErrorBoundary가 Calendar/Templates에서 격리 (Plan 3)
  3. ✓ storageKeys.js에서만 localStorage 키 참조 (Plan 1+훅들)
  4. ✓ src/features/ 폴더 구조 존재 (Plan 1)
  5. ✓ 도메인 훅이 상태/사이드이펙트 소유 (Plan 4~6)
- 사용자 경험 동등성 100%
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-06-SUMMARY.md` documenting:
- useGoogleCalendar 추출 라인 매핑
- BloggerMasterApp.jsx 라인 수 변화 (phase 시작 → Plan 6 종료)
- 31개 UAT 항목 통과 결과
- Phase 2 진입을 위한 인계 사항 (Supabase 복합 useEffect 위치, 의도적으로 미해결한 보안 이슈 목록 — SEC-01, SEC-02 Phase 2 대상)
</output>
