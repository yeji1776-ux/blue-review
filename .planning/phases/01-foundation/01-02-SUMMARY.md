---
phase: 01-foundation
plan: 02
subsystem: infrastructure
tags: [zod, parsing, resilience, localStorage]
requires:
  - src/constants/storageKeys.js (Plan 01)
  - zod@^4 (Plan 01)
provides:
  - src/lib/parseWithSchema.js (parseWithSchema)
  - src/features/profile/schemas.js (profileSchema)
  - src/features/template/schemas.js (templatesSchema, ftcTemplatesSchema)
  - src/features/schedule/schemas.js (schedulesSchema, geminiParsedSchema)
  - src/features/calendar/schemas.js (gcalSelectedSchema)
  - src/features/settings/schemas.js (hashtagsSchema, savedTextsSchema)
affects: [src/BloggerMasterApp.jsx]
tech_stack:
  added: []
  patterns: [zod safeParse + fallback, passthrough schemas for backward compat]
key_files:
  created:
    - src/lib/parseWithSchema.js
    - src/features/profile/schemas.js
    - src/features/template/schemas.js
    - src/features/schedule/schemas.js
    - src/features/calendar/schemas.js
    - src/features/settings/schemas.js
  modified:
    - src/BloggerMasterApp.jsx
decisions:
  - gcal_selected_cal은 평문 문자열이라 JSON.parse 대상이 아니어서 schema.safeParse(rawString) 직접 호출
  - 모든 도메인 스키마에 .passthrough() 적용 — 알 수 없는 필드 보존 (Pitfall 5)
  - Gemini 응답 경로는 fetch 데이터라 parseWithSchema 시그니처 대신 try/catch + safeParse 직접 사용
metrics:
  duration: ~10min
  completed: 2026-04-09
requirements: [INFRA-02]
---

# Phase 01 Plan 02: Safe Parser Summary

zod 기반 parseWithSchema 유틸과 5개 도메인 schemas를 도입하여 BloggerMasterApp의 9개 JSON.parse 호출을 안전 파서로 교체. 손상된 localStorage 데이터에서도 앱이 크래시 없이 기본값으로 복구 (INFRA-02 충족).

## Tasks Completed

| Task | Name                                                | Commit  |
|------|-----------------------------------------------------|---------|
| 1    | parseWithSchema 유틸 + 5개 도메인 schemas.js 작성    | 2e9f333 |
| 2    | BloggerMasterApp.jsx 9개 JSON.parse 호출 교체        | fe01c97 |

## 교체된 9개 호출

| # | 위치(이전) | 키 | 도메인 | 교체 패턴 |
|---|-----------|----|----|-----------|
| 1 | L383 profile init | blogger_profile | profile | parseWithSchema(profileSchema, ...) → null이면 defaults, 아니면 enabledPlatforms 병합 |
| 2 | L410 templates init | blogger_templates | template | parseWithSchema(templatesSchema, …, defaults) |
| 3 | L454 ftcTemplates init | blogger_ftc_templates | template | parseWithSchema(ftcTemplatesSchema, …, defaults) |
| 4 | L484 hashtags init | blogger_hashtags | settings | parseWithSchema(hashtagsSchema, …, defaults) |
| 5 | L602 gcalSelectedCal init | blogger_profile.gcalSelectedCal | calendar/profile | parseWithSchema(profileSchema)에서 필드 추출 + gcalSelectedSchema.safeParse(rawString) |
| 6 | L645 gcalSelectedCal in fetch effect | blogger_profile.gcalSelectedCal | calendar/profile | parseWithSchema(profileSchema, ...) |
| 7 | L754 savedTexts init | blogger_saved_texts | settings | parseWithSchema(savedTextsSchema, …, []) |
| 8 | L818 schedules init | blogSchedules | schedule | parseWithSchema(schedulesSchema, …, null) → 예시 데이터 필터링 유지 |
| 9 | L1313 Gemini 응답 | (fetch body) | schedule | try/catch + geminiParsedSchema.safeParse → 실패 시 {} + console.warn |

## parseWithSchema 동작 케이스 검증

| 케이스 | 입력 | 결과 |
|--------|------|------|
| raw=null/undefined/'' | falsy | 즉시 fallback 반환 (no warn) |
| raw='not json' | JSON.parse 실패 | catch → console.warn → fallback |
| raw='{}' but schema 위반 | safeParse 실패 | console.warn → fallback |
| raw=정상 JSON & 스키마 통과 | safeParse 성공 | result.data 반환 |

코드 경로 검증 (parseWithSchema.js):
- Line 4: `if (!raw) return fallback`
- Line 7-10: try/catch JSON.parse → warn + fallback
- Line 12-15: safeParse 분기 → warn + fallback
- Line 16: 성공 시 result.data 반환

## Verification

- npm run build: PASS (1861 modules transformed, 0 exit)
- npm run lint: 33 problems (baseline 동일 — 신규 에러/경고 0건, 모두 plan 1 이전부터 존재)
- BloggerMasterApp.jsx grep `JSON.parse`: 1건 (라인 1321 — Gemini 응답 try/catch 내부, 의도된 위치)
- localStorage 키 문자열 변경 0건 (모두 STORAGE_KEYS 경유 또는 기존 인라인 그대로)
- localStorage.setItem 호출 변경 없음 (저장 로직 유지)
- 기존 사용자 데이터 형태 유지 (.passthrough()로 알 수 없는 필드 보존)

## Deviations from Plan

None — plan executed as written.

소소한 적응:
- gcal_selected_cal은 `localStorage.setItem(..., primary.id)`로 평문 저장되어 JSON.parse 대상이 아님. parseWithSchema 시그니처가 맞지 않아 `gcalSelectedSchema.safeParse(rawString)` 직접 호출. 결과적으로 검증 로직은 유지되고 schema 자체는 z.string() 그대로.
- Gemini 응답 (Task 2 #9): 플랜이 안내한 대로 try/catch + safeParse 직접 패턴 적용.

## Import Patterns for Subsequent Plans

```js
import { parseWithSchema } from './lib/parseWithSchema'
import { profileSchema } from './features/profile/schemas'
import { templatesSchema, ftcTemplatesSchema } from './features/template/schemas'
import { schedulesSchema, geminiParsedSchema } from './features/schedule/schemas'
import { gcalSelectedSchema } from './features/calendar/schemas'
import { hashtagsSchema, savedTextsSchema } from './features/settings/schemas'

// useProfile / useTemplates / useSchedules 훅 추출 시 동일 schema 재사용:
const [schedules, setSchedules] = useState(() =>
  parseWithSchema(schedulesSchema, localStorage.getItem(STORAGE_KEYS.SCHEDULES), [])
)
```

후속 plan 4-6 (hooks 추출)에서 동일 schemas 모듈을 import하여 hook 내부에서 재사용하면 BloggerMasterApp.jsx의 init useState 로직을 그대로 옮길 수 있음.

## Self-Check: PASSED

- src/lib/parseWithSchema.js: FOUND
- src/features/profile/schemas.js: FOUND
- src/features/template/schemas.js: FOUND
- src/features/schedule/schemas.js: FOUND
- src/features/calendar/schemas.js: FOUND
- src/features/settings/schemas.js: FOUND
- commit 2e9f333: FOUND
- commit fe01c97: FOUND
- BloggerMasterApp.jsx JSON.parse 호출 1개 (의도된 Gemini 위치)
