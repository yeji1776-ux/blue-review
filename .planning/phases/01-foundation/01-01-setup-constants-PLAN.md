---
phase: 01-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - src/constants/storageKeys.js
  - src/constants/plans.js
  - src/constants/admin.js
  - src/features/schedule/.gitkeep
  - src/features/template/.gitkeep
  - src/features/calendar/.gitkeep
  - src/features/profile/.gitkeep
  - src/features/settings/.gitkeep
  - src/components/ui/.gitkeep
  - src/BloggerMasterApp.jsx
autonomous: true
requirements: [INFRA-03, INFRA-04]
must_haves:
  truths:
    - "react-error-boundary와 zod가 package.json에 추가되어 npm install 후 정상 동작한다"
    - "src/features/{schedule,template,calendar,profile,settings}/{components,hooks,services,constants} 디렉토리가 모두 존재한다"
    - "src/components/ui/ 디렉토리가 존재한다"
    - "모든 localStorage 키가 src/constants/storageKeys.js의 STORAGE_KEYS 객체 한 곳에서 정의된다"
    - "PLAN_LIMITS, PLAN_META, ADMIN_EMAILS가 src/constants/ 파일에서 import되며 BloggerMasterApp 인라인 선언이 제거된다"
    - "npm run build가 0 exit code로 통과한다"
  artifacts:
    - path: "src/constants/storageKeys.js"
      provides: "16개 localStorage 키 상수"
      contains: "STORAGE_KEYS"
    - path: "src/constants/plans.js"
      provides: "PLAN_LIMITS, PLAN_META 상수"
    - path: "src/constants/admin.js"
      provides: "ADMIN_EMAILS 상수"
    - path: "src/features/schedule/hooks"
      provides: "Phase 1 훅 배치 위치"
  key_links:
    - from: "src/BloggerMasterApp.jsx"
      to: "src/constants/storageKeys.js"
      via: "import { STORAGE_KEYS }"
      pattern: "from ['\"].*constants/storageKeys"
    - from: "src/BloggerMasterApp.jsx"
      to: "src/constants/plans.js"
      via: "import { PLAN_LIMITS, PLAN_META }"
      pattern: "from ['\"].*constants/plans"
---

<objective>
Phase 1의 인프라 토대를 만든다 — 라이브러리 설치, feature 폴더 구조 생성, 매직 스트링/상수 추출.

Purpose: 이후 plan들이 의존할 디렉토리와 상수가 존재해야 ErrorBoundary, parseWithSchema 유틸, 도메인 훅들이 작성될 수 있다. INFRA-03과 INFRA-04를 충족.
Output: 새 라이브러리 2개, src/constants/ 3개 파일, src/features/ 5개 도메인 디렉토리, src/components/ui/ 디렉토리, BloggerMasterApp의 인라인 상수 → import 교체.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/phases/01-foundation/01-RESEARCH.md
@CLAUDE.md
@src/BloggerMasterApp.jsx
@package.json

<interfaces>
research에서 검증한 STORAGE_KEYS 전체 목록:

```javascript
// src/constants/storageKeys.js (RESEARCH.md 라인 459~481 참조)
export const STORAGE_KEYS = {
  PROFILE: 'blogger_profile',
  TEMPLATES: 'blogger_templates',
  FTC_TEMPLATES: 'blogger_ftc_templates',
  SCHEDULES: 'blogSchedules',
  HASHTAGS: 'blogger_hashtags',
  SAVED_TEXTS: 'blogger_saved_texts',
  FONT_SIZE: 'blogger_font_size',
  THEME_COLOR: 'theme_color',
  LOCATION_PERM: 'location_perm',
  GCAL_TOKEN: 'gcal_token',
  GCAL_TOKEN_EXPIRY: 'gcal_token_expiry',
  GCAL_REFRESH_TOKEN: 'gcal_refresh_token',
  GCAL_SELECTED_CAL: 'gcal_selected_cal',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  BIOMETRIC_CRED_ID: 'biometric_cred_id',
};
```

PLAN_LIMITS / PLAN_META / ADMIN_EMAILS는 BloggerMasterApp.jsx 상단에 인라인 선언되어 있다 — Grep으로 정확한 라인과 현재 값을 확인 후 그대로 새 파일로 옮길 것.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 라이브러리 설치 + feature/ui 폴더 구조 생성</name>
  <read_first>
    - .planning/phases/01-foundation/01-RESEARCH.md (라인 102~147 폴더 구조)
    - package.json (현재 dependencies 확인)
  </read_first>
  <files>
    package.json, package-lock.json,
    src/features/schedule/.gitkeep, src/features/schedule/components/.gitkeep, src/features/schedule/hooks/.gitkeep, src/features/schedule/services/.gitkeep, src/features/schedule/constants/.gitkeep,
    src/features/template/.gitkeep, src/features/template/components/.gitkeep, src/features/template/hooks/.gitkeep, src/features/template/services/.gitkeep, src/features/template/constants/.gitkeep,
    src/features/calendar/.gitkeep, src/features/calendar/components/.gitkeep, src/features/calendar/hooks/.gitkeep, src/features/calendar/services/.gitkeep, src/features/calendar/constants/.gitkeep,
    src/features/profile/.gitkeep, src/features/profile/components/.gitkeep, src/features/profile/hooks/.gitkeep, src/features/profile/services/.gitkeep, src/features/profile/constants/.gitkeep,
    src/features/settings/.gitkeep, src/features/settings/components/.gitkeep, src/features/settings/hooks/.gitkeep, src/features/settings/services/.gitkeep, src/features/settings/constants/.gitkeep,
    src/components/ui/.gitkeep
  </files>
  <action>
    1. `npm install react-error-boundary@^6.1.1 zod@^4.3.6` 실행 (D-08~D-14, RESEARCH 라인 103). .npmrc legacy-peer-deps=true가 설정되어 있으므로 추가 플래그 불필요.
    2. D-01/D-02/D-03 per: src/features/ 5개 도메인 × {components, hooks, services, constants} 하위 폴더 + src/components/ui/ 디렉토리 생성. 빈 디렉토리는 git 추적을 위해 각 폴더에 .gitkeep 파일을 만든다.
    3. 기존 폴더(src/components/, src/hooks/, src/lib/)는 그대로 유지 — 절대 옮기지 않는다.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <acceptance_criteria>
    - package.json에 react-error-boundary, zod가 추가됨
    - npm install이 성공하고 node_modules에 두 라이브러리 존재
    - src/features/{schedule,template,calendar,profile,settings}/{components,hooks,services,constants}/.gitkeep 25개 파일 모두 존재
    - src/components/ui/.gitkeep 존재
    - src/components/LoginPage.jsx, src/hooks/useAuth.js, src/lib/supabase.js는 변경되지 않음
    - npm run build exit 0
  </acceptance_criteria>
  <done>새 라이브러리 설치 완료, feature 폴더 골격 생성 완료, 빌드 통과</done>
</task>

<task type="auto">
  <name>Task 2: 상수 파일 추출 + BloggerMasterApp 인라인 선언 교체</name>
  <read_first>
    - src/BloggerMasterApp.jsx (PLAN_LIMITS, PLAN_META, ADMIN_EMAILS, EMAIL_DOMAINS 인라인 선언 위치 Grep으로 찾기)
    - .planning/phases/01-foundation/01-RESEARCH.md (라인 459~510 상수 정의)
  </read_first>
  <files>
    src/constants/storageKeys.js,
    src/constants/plans.js,
    src/constants/admin.js,
    src/BloggerMasterApp.jsx
  </files>
  <action>
    Pitfall 6 (RESEARCH 라인 446~449) 순서 엄수 — 새 파일 export 추가 → BloggerMasterApp import 추가 → 인라인 선언 삭제.

    1. src/constants/storageKeys.js 작성: RESEARCH 라인 459~481의 STORAGE_KEYS 객체 그대로. 16개 키 모두 포함. 키 이름 변경 절대 금지 — 기존 localStorage 데이터 하위 호환성 유지(D-12 기반의 Phase 1 핵심 제약).
    2. src/constants/plans.js 작성: BloggerMasterApp 상단에서 PLAN_LIMITS, PLAN_META를 Grep으로 찾아 그대로 옮긴다 (RESEARCH 라인 487~497 형태). 값 변경 금지.
    3. src/constants/admin.js 작성: BloggerMasterApp의 ADMIN_EMAILS 인라인 배열을 그대로 옮긴다. 한국어 코멘트 한 줄(`// 관리자 이메일 — Phase 2에서 user_roles 테이블로 이전 예정 (SEC-04)`) 포함.
    4. BloggerMasterApp.jsx 상단에 import 추가:
       ```js
       import { STORAGE_KEYS } from './constants/storageKeys'
       import { PLAN_LIMITS, PLAN_META } from './constants/plans'
       import { ADMIN_EMAILS } from './constants/admin'
       ```
    5. 인라인 선언 삭제 (PLAN_LIMITS/PLAN_META/ADMIN_EMAILS).
    6. **CRITICAL — 이 plan에서는 localStorage 키 문자열 인라인 사용은 교체하지 않는다.** 키 인라인 → STORAGE_KEYS.* 교체는 Plan 2(safe parser plan) + Plan 4~6(훅 추출)에서 각 영역 작업 시 점진적으로 진행한다. 이렇게 분리해야 diff가 작고 회귀 검증이 가능하다.
    7. EMAIL_DOMAINS는 LoginPage.jsx에 있는 경우 이번에 옮기지 않는다 — UI 코드와 결합도가 높아 Phase 3 검토 대상.
    8. 코드 스타일: 2-space indent, single quotes, 세미콜론 없음 (CLAUDE.md CONVENTIONS 준수).
  </action>
  <verify>
    <automated>npm run build &amp;&amp; npm run lint</automated>
  </verify>
  <acceptance_criteria>
    - src/constants/storageKeys.js, plans.js, admin.js 3개 파일 존재
    - STORAGE_KEYS 16개 키 모두 정의 (PROFILE, TEMPLATES, FTC_TEMPLATES, SCHEDULES, HASHTAGS, SAVED_TEXTS, FONT_SIZE, THEME_COLOR, LOCATION_PERM, GCAL_TOKEN, GCAL_TOKEN_EXPIRY, GCAL_REFRESH_TOKEN, GCAL_SELECTED_CAL, BIOMETRIC_ENABLED, BIOMETRIC_CRED_ID)
    - 키 값(문자열)이 RESEARCH 매핑과 100% 일치 — 'blogger_profile', 'blogSchedules' 등 변경 없음
    - BloggerMasterApp.jsx에서 PLAN_LIMITS/PLAN_META/ADMIN_EMAILS 인라인 선언이 제거되고 import로 대체됨
    - npm run build exit 0, npm run lint 경고 수가 기존 baseline 이하
    - LoginPage.jsx, useAuth.js 변경 없음
    - 수동 sanity: `git diff` 결과에 localStorage.getItem/setItem 호출의 키 문자열은 변경되지 않아야 함
  </acceptance_criteria>
  <done>3개 상수 파일이 생성되고 BloggerMasterApp이 import로 사용. 빌드/린트 통과. localStorage 키 인라인 사용은 그대로 유지(다음 plan들에서 점진 교체).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 없음 (Phase 1 Plan 1 한정) | 이 plan은 디렉토리/상수 추출만 — 새 trust boundary 도입 없음. localStorage 평문 저장은 그대로(기능 동등성), Google OAuth 토큰 보안은 Phase 2 SEC-01에서 처리. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01-01 | Tampering | src/constants/admin.js (ADMIN_EMAILS 하드코딩) | accept | Phase 1 범위 — 기존 인라인 동등 이전. SEC-04(Phase 2)에서 Supabase user_roles 테이블로 이전 예정. 이 plan에서 보안 수준 변경 없음. |
| T-01-01-02 | Information Disclosure | npm 의존성 추가 (react-error-boundary, zod) | mitigate | 양쪽 모두 검증된 메이저 라이브러리(react-error-boundary 6.1.1, zod 4.3.6). package-lock.json 커밋으로 supply chain 고정. |
</threat_model>

<verification>
- npm run build exit 0
- npm run lint exit 0 (또는 기존 경고 수 이하)
- src/features/, src/components/ui/, src/constants/ 디렉토리 존재 확인
- BloggerMasterApp.jsx grep: PLAN_LIMITS/PLAN_META/ADMIN_EMAILS 인라인 선언이 검색되지 않아야 함
- BloggerMasterApp.jsx grep: localStorage.getItem/setItem 호출 수가 작업 전과 동일해야 함 (이번 plan은 키 인라인을 교체하지 않음)
- 수동 UAT: `npm run dev` 후 앱 로드 → 기존 로그인/스케줄/템플릿 화면이 동등하게 표시되는지 sanity check
</verification>

<success_criteria>
- INFRA-03 부분 충족: 매직 스트링이 src/constants/로 추출됨 (storageKeys 정의 완료, 사용처 교체는 후속 plan)
- INFRA-04 충족: src/features/{schedule,template,calendar,profile,settings} + src/components/ui/ 폴더 구조 완성
- 빌드/린트/수동 sanity 모두 통과
- 사용자 경험 동등성 유지 (localStorage 키 변경 없음)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-01-SUMMARY.md` documenting:
- 설치된 라이브러리 버전
- 생성된 디렉토리/파일 목록
- BloggerMasterApp.jsx 변경 라인 수
- 후속 plan(02~06)을 위한 STORAGE_KEYS / PLAN_LIMITS import 패턴 예시
</output>
