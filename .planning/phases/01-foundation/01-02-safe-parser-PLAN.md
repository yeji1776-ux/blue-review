---
phase: 01-foundation
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/parseWithSchema.js
  - src/features/profile/schemas.js
  - src/features/template/schemas.js
  - src/features/schedule/schemas.js
  - src/features/calendar/schemas.js
  - src/features/settings/schemas.js
  - src/BloggerMasterApp.jsx
autonomous: true
requirements: [INFRA-02]
must_haves:
  truths:
    - "src/lib/parseWithSchema.js가 존재하고 zod safeParse 기반으로 동작한다"
    - "5개 feature 도메인에 schemas.js가 존재한다 (profile, template, schedule, calendar, settings)"
    - "BloggerMasterApp.jsx의 9개 JSON.parse 호출이 모두 parseWithSchema 또는 safeParse 호출로 교체된다"
    - "JSON.parse 실패 또는 스키마 불일치 시 안전한 기본값이 반환되고 console.warn이 호출된다"
    - "기존 localStorage 데이터 형태가 유지되어 사용자 데이터가 손실되지 않는다"
  artifacts:
    - path: "src/lib/parseWithSchema.js"
      provides: "안전한 JSON 파싱 유틸"
      exports: ["parseWithSchema"]
    - path: "src/features/profile/schemas.js"
      provides: "profileSchema (passthrough)"
    - path: "src/features/template/schemas.js"
      provides: "templatesSchema, ftcTemplatesSchema"
    - path: "src/features/schedule/schemas.js"
      provides: "schedulesSchema, geminiResponseSchema"
    - path: "src/features/calendar/schemas.js"
      provides: "gcalSelectedSchema"
    - path: "src/features/settings/schemas.js"
      provides: "hashtagsSchema, savedTextsSchema"
  key_links:
    - from: "src/BloggerMasterApp.jsx"
      to: "src/lib/parseWithSchema.js"
      via: "import { parseWithSchema }"
      pattern: "from ['\"].*lib/parseWithSchema"
    - from: "src/BloggerMasterApp.jsx"
      to: "src/features/*/schemas.js"
      via: "schema imports"
      pattern: "from ['\"].*features/.*/schemas"
---

<objective>
9개 JSON.parse 호출을 zod 기반 안전 파서로 교체하여 잘못된 localStorage 데이터로 인한 앱 크래시를 제거한다 (INFRA-02).

Purpose: 기존 사용자가 손상된 데이터를 가지고 있더라도 앱이 크래시하지 않고 기본값으로 복구된다. Phase 1 훅 추출의 전제 조건.
Output: parseWithSchema 유틸 1개, 5개 feature schemas, BloggerMasterApp의 9개 호출 교체.
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

<interfaces>
9개 JSON.parse 호출 위치 (RESEARCH 라인 305~316):

| # | 라인 | 키 | 도메인 | 기본값 |
|---|------|----|---------|------|
| 1 | 392 | blogger_profile | profile | 객체(병합) |
| 2 | 419 | blogger_templates | template | [defaultTemplate] |
| 3 | 463 | blogger_ftc_templates | template | [defaultFtc] |
| 4 | 494 | blogger_hashtags | settings | { '맛집': [...], ... } |
| 5 | 611 | blogger_profile (gcalSelectedCal) | calendar | 'primary' |
| 6 | 647 | blogger_profile (gcalSelectedCal) | calendar | 'primary' |
| 7 | 764 | blogger_saved_texts | settings | [] |
| 8 | 827 | blogSchedules | schedule | [] |
| 9 | 1322 | Gemini API JSON 응답 | schedule | emptyParsed |

parseWithSchema 시그니처 (RESEARCH 라인 156~169):
```js
parseWithSchema(schema, raw, fallback) → 검증된 데이터 또는 fallback
```

Pitfall 5 (RESEARCH 라인 441~444): 모든 스키마는 `.passthrough()`로 정의 — 알 수 없는 필드 보존, 하위 호환 유지.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: parseWithSchema 유틸 + 5개 도메인 schemas.js 작성</name>
  <read_first>
    - .planning/phases/01-foundation/01-RESEARCH.md (라인 154~213, 305~350, 441~444)
    - src/BloggerMasterApp.jsx 라인 380~500, 600~700, 760~830, 1300~1340 (각 JSON.parse의 현재 데이터 형태 확인)
  </read_first>
  <files>
    src/lib/parseWithSchema.js,
    src/features/profile/schemas.js,
    src/features/template/schemas.js,
    src/features/schedule/schemas.js,
    src/features/calendar/schemas.js,
    src/features/settings/schemas.js
  </files>
  <action>
    1. src/lib/parseWithSchema.js: RESEARCH 라인 156~169 코드 그대로. raw가 falsy면 fallback 즉시 반환, JSON.parse try/catch, schema.safeParse 결과 분기. 실패 시 console.warn로 한국어 prefix `'[parseWithSchema] 스키마 검증 실패, 기본값 사용:'` 기록 (D-12 per).

    2. 5개 schemas.js 각각 작성. **모든 스키마에 `.passthrough()` 사용** — 알 수 없는 필드 유지로 하위 호환(Pitfall 5).

       - **profile/schemas.js**: `profileSchema = z.object({ nickname: z.string().optional(), blogUrl: z.string().optional(), enabledPlatforms: z.record(z.boolean()).optional(), gcalSelectedCal: z.string().optional() }).passthrough()`. BloggerMasterApp 라인 380~395의 실제 필드를 Read로 확인 후 보강.
       - **template/schemas.js**: `templateItemSchema = z.object({ id: z.union([z.string(), z.number()]), title: z.string().default(''), content: z.string().default('') }).passthrough()`. `templatesSchema = z.array(templateItemSchema)`, `ftcTemplatesSchema = z.array(templateItemSchema)`.
       - **schedule/schemas.js**: `scheduleItemSchema = z.object({ id: z.union([z.string(), z.number()]) }).passthrough()`. `schedulesSchema = z.array(scheduleItemSchema)`. Gemini 응답용으로는 `geminiParsedSchema = z.object({}).passthrough()` (느슨 — 응답 형태가 가변적).
       - **calendar/schemas.js**: `gcalSelectedSchema = z.string()` (단순 문자열).
       - **settings/schemas.js**: `hashtagsSchema = z.record(z.array(z.string())).default({})` + `.passthrough()` 불필요(record), `savedTextsSchema = z.array(z.object({ id: z.union([z.string(), z.number()]) }).passthrough())`.

    3. zod import는 `import { z } from 'zod'`. 코드 스타일: 2-space indent, single quotes, 세미콜론 없음.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <acceptance_criteria>
    - 6개 파일 모두 존재 (parseWithSchema.js + 5 schemas)
    - parseWithSchema가 raw=null, raw='', raw='invalid', raw='{}'(스키마 위반) 4가지 케이스 모두에서 fallback 반환
    - 각 schema가 `.passthrough()` 또는 record 사용
    - npm run build 통과
    - 이 task에서는 BloggerMasterApp.jsx를 수정하지 않음
  </acceptance_criteria>
  <done>유틸 + 스키마 6개 파일 작성. 빌드 통과.</done>
</task>

<task type="auto">
  <name>Task 2: BloggerMasterApp.jsx 9개 JSON.parse 호출 교체</name>
  <read_first>
    - src/BloggerMasterApp.jsx 라인 380~500, 600~700, 760~830, 1300~1340 (9개 호출 컨텍스트)
    - .planning/phases/01-foundation/01-RESEARCH.md (라인 173~182 교체 패턴)
  </read_first>
  <files>src/BloggerMasterApp.jsx</files>
  <action>
    9개 호출을 한 번에 교체. 각 위치에서:

    1. 라인 392 (blogger_profile): `parseWithSchema(profileSchema, localStorage.getItem(STORAGE_KEYS.PROFILE), <기존 기본 객체>)`로 교체. 기존 병합 로직(spread)이 있다면 fallback 이후에 spread 처리 유지.
    2. 라인 419 (blogger_templates): `parseWithSchema(templatesSchema, localStorage.getItem(STORAGE_KEYS.TEMPLATES), [defaultTemplate])`.
    3. 라인 463 (blogger_ftc_templates): `parseWithSchema(ftcTemplatesSchema, localStorage.getItem(STORAGE_KEYS.FTC_TEMPLATES), [defaultFtcTemplate])`.
    4. 라인 494 (blogger_hashtags): `parseWithSchema(hashtagsSchema, localStorage.getItem(STORAGE_KEYS.HASHTAGS), DEFAULT_HASHTAGS)`. 기존 기본 카테고리 객체 유지.
    5. 라인 611 (gcalSelectedCal in profile): `parseWithSchema(gcalSelectedSchema, localStorage.getItem(STORAGE_KEYS.GCAL_SELECTED_CAL), 'primary')`. **주의: Pitfall 2** — 라인 611/647 두 위치 모두 동일 키를 직접 읽고 있는데, 현재 코드는 `blogger_profile` JSON에서 `gcalSelectedCal` 필드를 읽는 형태일 수도 있다. 실제 코드를 Read로 확인 후, 만약 profile JSON 내부 필드 참조라면 이 task에서는 형태를 바꾸지 말고 기존 JSON.parse를 parseWithSchema(profileSchema, ...)로 교체한 뒤 `.gcalSelectedCal ?? 'primary'` 접근. 분리는 Plan 6 useGoogleCalendar에서 처리.
    6. 라인 647: 5번과 동일 정책.
    7. 라인 764 (blogger_saved_texts): `parseWithSchema(savedTextsSchema, localStorage.getItem(STORAGE_KEYS.SAVED_TEXTS), [])`.
    8. 라인 827 (blogSchedules): `parseWithSchema(schedulesSchema, localStorage.getItem(STORAGE_KEYS.SCHEDULES), [])`. 기존의 예시 데이터 필터링 로직은 parseWithSchema 호출 결과를 받아 그대로 적용.
    9. 라인 1322 (Gemini API 응답): `geminiParsedSchema.safeParse(JSON.parse(...))` 패턴. raw 입력이 localStorage가 아닌 fetch 응답이므로 parseWithSchema 시그니처가 맞지 않을 수 있다. 이 경우 try/catch + safeParse로 직접 처리하고 실패 시 emptyParsed 반환 + console.warn.

    추가 import:
    ```js
    import { parseWithSchema } from './lib/parseWithSchema'
    import { profileSchema } from './features/profile/schemas'
    import { templatesSchema, ftcTemplatesSchema } from './features/template/schemas'
    import { schedulesSchema, geminiParsedSchema } from './features/schedule/schemas'
    import { gcalSelectedSchema } from './features/calendar/schemas'
    import { hashtagsSchema, savedTextsSchema } from './features/settings/schemas'
    ```

    **CRITICAL — 기존 동작 동등성 (CLAUDE.md 핵심 제약):**
    - localStorage 키 문자열 절대 변경 금지 (STORAGE_KEYS는 동일 값)
    - localStorage.setItem 호출은 이번 task에서 건드리지 않음 (저장 로직 유지)
    - 기본값 객체 형태/필드는 기존과 동일 유지
    - 9개 위치 외에 JSON.parse 새로 추가 금지
  </action>
  <verify>
    <automated>npm run build &amp;&amp; npm run lint</automated>
  </verify>
  <acceptance_criteria>
    - BloggerMasterApp.jsx에 `JSON.parse` 호출이 0개 (또는 9번 호출 위치에 없음)
    - parseWithSchema 또는 schema.safeParse 호출 9개 (또는 그에 상응하는 패턴)
    - npm run build exit 0
    - npm run lint 경고 수가 baseline 이하
    - 수동 UAT 체크리스트 (각 항목 통과해야 함):
      a. localStorage 비운 상태에서 앱 로드 → 크래시 없음, 기본 화면 표시
      b. 정상 데이터로 로드 → 기존 스케줄/템플릿/프로필이 그대로 표시
      c. localStorage `blogger_templates`를 `'invalid json'`로 임의 손상 후 reload → 크래시 없음, 기본 템플릿 표시, 콘솔에 `[parseWithSchema]` 경고
      d. localStorage 키 값 grep: `blogger_profile`, `blogger_templates`, `blogSchedules` 등 모든 키 문자열이 변경 없이 동일 (STORAGE_KEYS.* 경유 또는 직접 호출 모두 인정)
  </acceptance_criteria>
  <done>9개 JSON.parse가 모두 안전 파서로 교체. 손상된 localStorage에서도 앱이 크래시 없이 로드. 빌드/린트 통과.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| localStorage → app state | localStorage는 사용자가 DevTools로 임의 수정 가능. 기존 코드는 JSON.parse가 직접 throw 하면 크래시했음. 이 plan이 신뢰 경계를 처음으로 명시화. |
| Gemini API 응답 → app state | 외부 API 응답을 신뢰할 수 없음. 라인 1322에서 schema 검증 도입. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-02-01 | Tampering | localStorage 사용자 임의 수정 | mitigate | 9개 JSON.parse 호출에 zod safeParse 적용. 실패 시 안전한 기본값 + console.warn (D-12 per). 앱 크래시 방지. |
| T-01-02-02 | Denial of Service | 손상된 localStorage 데이터로 인한 앱 크래시 | mitigate | parseWithSchema 유틸이 try/catch로 JSON.parse 예외 흡수, schema 검증 실패도 fallback 처리. |
| T-01-02-03 | Tampering | Gemini API 응답 신뢰 (라인 1322) | mitigate | geminiParsedSchema.safeParse 적용으로 외부 응답 검증. |
| T-01-02-04 | Information Disclosure | localStorage 평문 저장 자체 | accept | Phase 1 범위 — 기능 동등성 유지. SEC-01(Phase 2)에서 토큰 보안 처리. |
</threat_model>

<verification>
- npm run build, npm run lint 통과
- BloggerMasterApp.jsx에 JSON.parse 직접 호출이 9개 위치에서 모두 제거됨 (Gemini는 safeParse로 변경 가능)
- 손상 데이터 시뮬레이션 UAT (acceptance_criteria 참조)
- localStorage 키 문자열이 한 글자도 변경되지 않음 (git diff로 확인)
</verification>

<success_criteria>
- INFRA-02 충족: 9개 JSON.parse가 zod 검증 + 안전 기본값 패턴으로 전환됨
- 사용자 경험 동등성 유지 (정상 데이터 케이스에서 동작 변화 없음)
- 손상 데이터 케이스에서 앱이 크래시하지 않고 복구됨 (회복력 향상)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-02-SUMMARY.md` documenting:
- 교체된 9개 호출의 라인 (작업 전/후)
- parseWithSchema 동작 케이스 4종 테스트 결과
- 후속 plan에서 schemas.js 재사용 가이드 (훅 추출 시 동일 schema import)
</output>
