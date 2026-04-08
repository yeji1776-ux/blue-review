---
phase: 01-foundation
plan: 04
type: execute
wave: 2
depends_on: [01, 02]
files_modified:
  - src/features/settings/hooks/useWeather.js
  - src/features/profile/hooks/useProfile.js
  - src/BloggerMasterApp.jsx
autonomous: true
requirements: [STATE-01, STATE-02]
must_haves:
  truths:
    - "useWeather 훅이 weather 상태와 위치 권한 로직, 날씨 fetch를 모두 소유한다"
    - "useProfile 훅이 profile 상태와 localStorage 읽기/쓰기를 소유한다"
    - "BloggerMasterApp이 두 훅을 호출만 하고 관련 useState/useEffect를 더 이상 직접 보유하지 않는다"
    - "기존 localStorage 키(blogger_profile, location_perm)와 데이터 형식이 변경되지 않는다"
    - "사용자가 보는 weather/profile 동작이 리팩토링 전후 동일하다"
  artifacts:
    - path: "src/features/settings/hooks/useWeather.js"
      provides: "useWeather() 훅"
      exports: ["useWeather"]
      min_lines: 30
    - path: "src/features/profile/hooks/useProfile.js"
      provides: "useProfile() 훅"
      exports: ["useProfile"]
      min_lines: 30
  key_links:
    - from: "src/BloggerMasterApp.jsx"
      to: "src/features/settings/hooks/useWeather.js"
      via: "useWeather() 호출"
      pattern: "useWeather\\("
    - from: "src/BloggerMasterApp.jsx"
      to: "src/features/profile/hooks/useProfile.js"
      via: "useProfile() 호출"
      pattern: "useProfile\\("
---

<objective>
의존성이 가장 낮은 두 도메인을 먼저 훅으로 추출한다 — useWeather, useProfile (STATE-01, STATE-02, D-04~D-07).

Purpose: 안전 추출 순서(RESEARCH 라인 72)의 첫 단계. 두 훅은 다른 도메인 의존성이 거의 없어 회귀 위험이 가장 낮다. 이후 plan들의 추출 패턴 검증.
Output: useWeather, useProfile 두 훅 + BloggerMasterApp 내부 useState/useEffect 제거 및 훅 호출로 교체.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/phases/01-foundation/01-RESEARCH.md
@CLAUDE.md
@src/BloggerMasterApp.jsx
@src/hooks/useAuth.js
@src/features/profile/schemas.js
@src/lib/parseWithSchema.js
@src/constants/storageKeys.js

<interfaces>
useAuth.js 패턴 (RESEARCH 라인 184~213): useState lazy initializer로 localStorage 읽고, save 함수에서 setState + localStorage.setItem.

useWeather 도메인 (RESEARCH 라인 357~362, BloggerMasterApp 라인 317~373):
- state: weather, locationPopup
- effect: mount 시 위치 권한 확인 + fetch
- functions: fetchWeather(), requestLocation()
- localStorage: location_perm, sessionStorage: location_perm

useProfile 도메인 (RESEARCH 라인 364~371, BloggerMasterApp 라인 376~414):
- state: profile (라인 376/392 lazy init), profileSaved (라인 400)
- functions: saveProfile(), updateProfile()
- localStorage: blogger_profile

UI 로컬 상태(훅에서 제외, D-07): profileSubTab, newPassword, confirmPassword, passwordMsg, locationPopup의 모달 UI 부분
- locationPopup은 weather 도메인 핵심 상태이므로 useWeather에 포함 (실제 위치 권한 흐름의 일부)
- profileSubTab은 UI 탭 선택이라 BloggerMasterApp에 유지

**Pitfall 2 (RESEARCH 라인 422~426):** profile lazy initializer를 useProfile에만 두고, useGoogleCalendar(Plan 6)는 useProfile 반환값을 받는다.

**중요 — Supabase 연동:** profile 상태는 BloggerMasterApp 라인 848~882의 복합 useEffect에서 Supabase user_data 테이블과 동기화된다. **이 plan에서는 Supabase 동기화 useEffect는 건드리지 않는다** — Plan 5(useSchedules)에서 한 번에 처리. useProfile은 setProfile setter를 export해서 외부 동기화 코드가 사용할 수 있게 한다.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: useWeather 훅 작성 + BloggerMasterApp 교체</name>
  <read_first>
    - src/BloggerMasterApp.jsx 라인 317~373 (weather 관련 전체 블록)
    - src/hooks/useAuth.js (훅 구조 패턴)
    - .planning/phases/01-foundation/01-RESEARCH.md (라인 357~362)
  </read_first>
  <files>
    src/features/settings/hooks/useWeather.js,
    src/BloggerMasterApp.jsx
  </files>
  <action>
    1. src/features/settings/hooks/useWeather.js 작성:
       - `import { useState, useEffect } from 'react'`
       - `import { STORAGE_KEYS } from '../../../constants/storageKeys'`
       - 내부 상태: `weather` (객체 또는 null), `locationPopup` (boolean)
       - 내부 함수: `fetchWeather(lat, lon)`, `requestLocation()` — BloggerMasterApp 라인 317~370의 코드를 그대로 옮긴다 (로직 변경 금지)
       - useEffect: mount 시 sessionStorage `location_perm` 또는 localStorage `location_perm` 체크 후 위치 권한 흐름 시작 — 기존 useEffect 라인 365 그대로
       - return: `{ weather, locationPopup, setLocationPopup, fetchWeather, requestLocation }`
       - localStorage/sessionStorage 키는 모두 STORAGE_KEYS.LOCATION_PERM 또는 직접 'location_perm' 사용 (sessionStorage는 STORAGE_KEYS에 없으므로 직접 문자열 OK — 단, 키 값 변경 금지)
       - 코드 스타일: 2-space, single quotes, 세미콜론 없음

    2. BloggerMasterApp.jsx 교체:
       - 상단 import 추가: `import { useWeather } from './features/settings/hooks/useWeather'`
       - 컴포넌트 함수 본문 상단에서 `const { weather, locationPopup, setLocationPopup, fetchWeather, requestLocation } = useWeather()` 호출
       - 기존 라인 317~373의 useState/useEffect/함수 선언 모두 삭제
       - 컴포넌트 내부에서 weather, locationPopup, setLocationPopup, fetchWeather, requestLocation 참조는 그대로 유지(이미 같은 이름)

    3. **CRITICAL 동등성 제약**:
       - 위치 권한 요청 흐름 절대 변경 금지
       - sessionStorage/localStorage 'location_perm' 키 값 변경 금지
       - weather 객체 형태 변경 금지
       - fetchWeather가 사용하는 외부 API 엔드포인트 변경 금지
  </action>
  <verify>
    <automated>npm run build &amp;&amp; npm run lint</automated>
  </verify>
  <acceptance_criteria>
    - src/features/settings/hooks/useWeather.js 존재, useWeather export
    - BloggerMasterApp.jsx에서 weather/locationPopup useState 선언이 제거됨
    - BloggerMasterApp.jsx에서 weather 관련 useEffect 제거됨
    - BloggerMasterApp.jsx 라인 수가 약 50줄 이상 감소
    - npm run build, npm run lint 통과
    - 수동 sanity: `npm run dev`로 앱 실행 → 위치 권한 팝업이 정상 표시되고 날씨 정보가 home 탭에 렌더됨
    - localStorage/sessionStorage `location_perm` 키 값 형태 동일
  </acceptance_criteria>
  <done>useWeather 추출 완료, BloggerMasterApp이 훅 호출로 교체, 빌드/린트/sanity 통과.</done>
</task>

<task type="auto">
  <name>Task 2: useProfile 훅 작성 + BloggerMasterApp 교체</name>
  <read_first>
    - src/BloggerMasterApp.jsx 라인 376~414 (profile 관련 블록), 라인 848~882 (Supabase 동기화 — 이번엔 건드리지 않음)
    - src/features/profile/schemas.js
    - src/lib/parseWithSchema.js
  </read_first>
  <files>
    src/features/profile/hooks/useProfile.js,
    src/BloggerMasterApp.jsx
  </files>
  <action>
    1. src/features/profile/hooks/useProfile.js 작성:
       - imports:
         ```js
         import { useState } from 'react'
         import { parseWithSchema } from '../../../lib/parseWithSchema'
         import { profileSchema } from '../schemas'
         import { STORAGE_KEYS } from '../../../constants/storageKeys'
         ```
       - DEFAULT_PROFILE 상수: BloggerMasterApp 라인 376~395에서 현재 사용 중인 기본 객체를 그대로 옮긴다 (nickname, blogUrl, enabledPlatforms, gcalSelectedCal 등 모든 필드)
       - state:
         ```js
         const [profile, setProfile] = useState(() => {
           const parsed = parseWithSchema(profileSchema, localStorage.getItem(STORAGE_KEYS.PROFILE), DEFAULT_PROFILE)
           return { ...DEFAULT_PROFILE, ...parsed } // 기존 병합 로직 유지
         })
         const [profileSaved, setProfileSaved] = useState(false)
         ```
       - functions:
         - `saveProfile(updated)`: setProfile(updated) + localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated)) + setProfileSaved(true) + setTimeout으로 false 복귀 (기존 saveProfile 로직 그대로)
         - `updateProfile(partial)`: 기존 동작 그대로
       - return: `{ profile, setProfile, profileSaved, saveProfile, updateProfile }`

    2. BloggerMasterApp.jsx 교체:
       - 상단 import 추가
       - 컴포넌트 본문에서 `const { profile, setProfile, profileSaved, saveProfile, updateProfile } = useProfile()` 호출
       - 기존 profile useState (라인 376/392), profileSaved useState (라인 400), saveProfile/updateProfile 함수 선언 모두 삭제
       - **profileSubTab, newPassword, confirmPassword, passwordMsg는 BloggerMasterApp에 그대로 유지** (D-07 — UI 로컬 상태)
       - **Supabase 동기화 useEffect (라인 848~882)는 이번 plan에서 건드리지 않는다** — 그대로 유지. setProfile setter가 export되어 있으므로 기존 코드가 동작 가능.
       - **Plan 2에서 라인 392의 JSON.parse를 parseWithSchema로 교체했더라도**, 이 task에서는 해당 위치 자체가 useProfile 안으로 이동하므로 BloggerMasterApp에서 그 코드 블록을 통째로 삭제한다.

    3. **CRITICAL 동등성 제약**:
       - blogger_profile 키 값 변경 금지
       - profile 객체 필드 형태 유지
       - DEFAULT_PROFILE의 enabledPlatforms 기본값 유지
       - profileSaved 토스트 동작 유지
       - Supabase 동기화 useEffect는 손대지 않음
  </action>
  <verify>
    <automated>npm run build &amp;&amp; npm run lint</automated>
  </verify>
  <acceptance_criteria>
    - src/features/profile/hooks/useProfile.js 존재, useProfile export, 30줄 이상
    - BloggerMasterApp.jsx에서 profile/profileSaved useState 선언 제거됨
    - BloggerMasterApp.jsx에서 saveProfile/updateProfile 함수 선언이 useProfile 내부로 이동
    - profileSubTab/newPassword/confirmPassword/passwordMsg는 BloggerMasterApp에 유지(D-07)
    - 라인 848~882의 Supabase 복합 useEffect는 변경 없음
    - npm run build, npm run lint 통과
    - 수동 sanity (UAT 체크리스트):
      a. 로그인 후 profile 탭 진입 → 기존 닉네임/블로그 URL/플랫폼 설정 동일하게 표시
      b. 닉네임 수정 후 저장 버튼 → 토스트 표시 + 새로고침 후에도 유지
      c. DevTools localStorage `blogger_profile` 키가 동일 형태로 저장됨
      d. Supabase 로그인 사용자 프로필 동기화 동작 정상 (Supabase 콘솔에서 user_data 변경 확인)
  </acceptance_criteria>
  <done>useProfile 추출 완료, profileSubTab 등 UI 상태는 컴포넌트에 유지, Supabase 동기화 영향 없음, 빌드/린트/UAT 통과.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 브라우저 위치 API → app | 사용자 위치 정보 — 기존 권한 흐름 그대로 유지 |
| localStorage profile/location_perm → app state | Plan 2에서 zod 검증 도입 완료. 이 plan은 해당 검증을 훅 안으로 이동만 함. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-04-01 | Tampering | localStorage blogger_profile 손상 | mitigate | useProfile 내부 lazy initializer가 parseWithSchema로 검증 (Plan 2 결과 활용). DEFAULT_PROFILE fallback. |
| T-01-04-02 | Information Disclosure | 위치 정보 외부 fetch | accept | 기존 동작 동등성. 위치 권한은 사용자 명시 동의(geolocation API). 외부 날씨 API 엔드포인트 변경 없음. |
</threat_model>

<verification>
- npm run build, npm run lint 통과
- BloggerMasterApp.jsx 라인 수 감소 (~80줄 이상)
- weather, profile useState 선언이 BloggerMasterApp에서 제거됨 (Grep: `useState.*weather`, `useState.*profile` 매치 없음)
- 수동 UAT: 위치 권한 팝업, 날씨 표시, 프로필 저장 모두 동작
- localStorage 키 값 변경 없음 (git diff 확인)
- Supabase user_data 동기화 회귀 없음
</verification>

<success_criteria>
- STATE-01 부분 충족: useWeather, useProfile 두 개 도메인 훅 추출
- STATE-02 부분 충족: 두 훅이 각자의 상태와 사이드이펙트 소유 (profile은 Supabase 동기화 제외 — Plan 5에서 처리)
- 사용자 경험 동등성: 모든 weather/profile 동작이 리팩토링 전과 동일
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-04-SUMMARY.md` documenting:
- 추출된 useState/useEffect 라인 매핑 (전 → 후)
- 훅 API 시그니처 (반환 객체 키)
- BloggerMasterApp.jsx 라인 수 변화
- Plan 5 useTemplates/useSchedules 추출 시 참고할 패턴
</output>
