---
phase: 01-foundation
plan: 05
type: execute
wave: 3
depends_on: [04]
files_modified:
  - src/features/template/hooks/useTemplates.js
  - src/features/schedule/hooks/useSchedules.js
  - src/BloggerMasterApp.jsx
autonomous: true
requirements: [STATE-01, STATE-02]
must_haves:
  truths:
    - "useTemplates 훅이 templates와 ftcTemplates 상태와 CRUD 함수를 소유한다"
    - "useSchedules 훅이 schedules와 savedTexts 상태를 소유한다"
    - "Supabase user_data 복합 useEffect(load + debounce upsert)가 useSchedules 또는 BloggerMasterApp에서 한 곳에 일관되게 유지된다"
    - "기존 localStorage 키(blogger_templates, blogger_ftc_templates, blogger_hashtags, blogger_saved_texts, blogSchedules)가 변경되지 않는다"
    - "템플릿 드래그 정렬, 스케줄 CRUD, 협찬/FTC 모달 동작이 리팩토링 전후 동일하다"
  artifacts:
    - path: "src/features/template/hooks/useTemplates.js"
      provides: "useTemplates 훅 (templates + ftcTemplates)"
      exports: ["useTemplates"]
      min_lines: 50
    - path: "src/features/schedule/hooks/useSchedules.js"
      provides: "useSchedules 훅"
      exports: ["useSchedules"]
      min_lines: 50
  key_links:
    - from: "src/BloggerMasterApp.jsx"
      to: "src/features/template/hooks/useTemplates.js"
      via: "useTemplates() 호출"
      pattern: "useTemplates\\("
    - from: "src/BloggerMasterApp.jsx"
      to: "src/features/schedule/hooks/useSchedules.js"
      via: "useSchedules() 호출"
      pattern: "useSchedules\\("
---

<objective>
가장 큰 두 도메인을 훅으로 추출 — useTemplates(템플릿+FTC), useSchedules(스케줄+저장된 글) (STATE-01, STATE-02).

Purpose: BloggerMasterApp 핵심 비즈니스 로직 대부분을 훅으로 옮긴다. Pitfall 1(Supabase 복합 useEffect)과 Pitfall 3(useTemplates의 PLAN_LIMITS 의존성)을 명시적으로 처리.
Output: 2개 훅 + BloggerMasterApp 내 관련 useState/useEffect/함수 제거.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation/01-RESEARCH.md
@CLAUDE.md
@src/BloggerMasterApp.jsx
@src/features/template/schemas.js
@src/features/schedule/schemas.js
@src/features/settings/schemas.js
@src/lib/parseWithSchema.js
@src/constants/storageKeys.js

<interfaces>
useTemplates 도메인 (RESEARCH 라인 373~382, BloggerMasterApp 라인 417~489):
- state: templates (라인 417/419), ftcTemplates (라인 461/463)
- 제외(D-07): editingTemplateId (423), editingFtcTemplateId (467) — UI 로컬
- functions: saveTemplates, addTemplate, updateTemplate, deleteTemplate, closeTemplateModal + ftc 동일 5개
- localStorage: blogger_templates, blogger_ftc_templates

**Pitfall 3 (RESEARCH 라인 428~432):** addTemplate이 PLAN_LIMITS, userPlan을 참조함. 권장 해결: useTemplates는 순수 CRUD만 제공(`appendTemplate(item)`), 플랜 제한 체크는 BloggerMasterApp에 남긴다.

useSchedules 도메인 (RESEARCH 라인 393~404, BloggerMasterApp 라인 757~899):
- state: schedules (824/827), savedTexts (762/764)
- 제외(D-07): selectedScheduleId (757), isModalOpen (758), parsedData (915)
- effects:
  - 라인 840: schedules 변경 시 localStorage 저장
  - 라인 848~882: **Supabase 복합 useEffect** — schedules + templates + profile + hashtags + savedTexts 모두 로드
  - 라인 885: 변경 debounce upsert
- functions: deleteSchedule, handleSmartParsing
- localStorage: blogSchedules, blogger_saved_texts

**Pitfall 1 (RESEARCH 라인 416~420) — CRITICAL 결정:**
Supabase 복합 useEffect를 분리하면 N개 fetch가 발생한다. **이 plan의 결정: 라인 848~882의 복합 load useEffect와 라인 885의 debounce upsert useEffect는 BloggerMasterApp.jsx에 그대로 유지한다.** 이유:
1. 여러 도메인 setter(setSchedules, setTemplates, setFtcTemplates, setProfile, setHashtags, setSavedTexts)에 동시 접근 필요
2. Phase 2에서 Supabase 테이블 분리 시 자연 해소
3. Phase 1의 핵심은 useState 추출이지 모든 useEffect 추출이 아님

따라서 useSchedules 훅은: schedules, savedTexts 상태 + localStorage 동기화 + deleteSchedule + handleSmartParsing만 담당. setSchedules, setSavedTexts setter를 export하여 BloggerMasterApp의 Supabase useEffect가 사용.

handleSmartParsing은 Gemini API를 호출하므로 외부 의존성(parsedData setter, 모달 setter 등)을 인자로 받는 형태로 분리하거나, 컴포넌트에 유지. 권장: handleSmartParsing은 BloggerMasterApp에 유지(UI/Gemini/모달과 결합도 높음), useSchedules는 데이터 setter만 제공.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: useTemplates 훅 작성 + BloggerMasterApp 교체</name>
  <read_first>
    - src/BloggerMasterApp.jsx 라인 417~489 (templates/ftcTemplates 전체 블록)
    - src/features/template/schemas.js
  </read_first>
  <files>
    src/features/template/hooks/useTemplates.js,
    src/BloggerMasterApp.jsx
  </files>
  <action>
    1. src/features/template/hooks/useTemplates.js 작성:
       - imports: useState, parseWithSchema, templatesSchema, ftcTemplatesSchema, STORAGE_KEYS
       - DEFAULT_TEMPLATES, DEFAULT_FTC_TEMPLATES 상수: BloggerMasterApp 라인 417~470에서 현재 기본값을 그대로 옮긴다
       - state:
         ```js
         const [templates, setTemplates] = useState(() =>
           parseWithSchema(templatesSchema, localStorage.getItem(STORAGE_KEYS.TEMPLATES), DEFAULT_TEMPLATES)
         )
         const [ftcTemplates, setFtcTemplates] = useState(() =>
           parseWithSchema(ftcTemplatesSchema, localStorage.getItem(STORAGE_KEYS.FTC_TEMPLATES), DEFAULT_FTC_TEMPLATES)
         )
         ```
       - functions:
         - `saveTemplates(updated)` → setTemplates + localStorage.setItem
         - `appendTemplate(item)` → setTemplates([...templates, item]) + localStorage.setItem (PLAN_LIMITS 체크 없음 — Pitfall 3)
         - `updateTemplate(id, patch)` → 기존 로직
         - `deleteTemplate(id)` → 기존 로직
         - 동일하게 ftc 5종 함수 (saveFtcTemplates, appendFtcTemplate, updateFtcTemplate, deleteFtcTemplate)
       - return: `{ templates, setTemplates, saveTemplates, appendTemplate, updateTemplate, deleteTemplate, ftcTemplates, setFtcTemplates, saveFtcTemplates, appendFtcTemplate, updateFtcTemplate, deleteFtcTemplate }`

    2. BloggerMasterApp.jsx 교체:
       - import 추가
       - 컴포넌트 본문 상단에서 destructure 호출
       - 기존 templates/ftcTemplates useState 선언 삭제 (라인 417, 461)
       - 기존 saveTemplates/addTemplate/updateTemplate/deleteTemplate/closeTemplateModal 함수 본체 삭제
       - **PLAN_LIMITS 체크 + addTemplate 호출은 BloggerMasterApp에 새로운 wrapper로 유지** (Pitfall 3 per):
         ```js
         const handleAddTemplate = (newTemplate) => {
           const limit = PLAN_LIMITS.template[userPlan]
           if (templates.length >= limit) {
             setShowUpgradeModal(true)
             setUpgradeReason('template')
             return
           }
           appendTemplate(newTemplate)
         }
         ```
         (FTC도 동일 패턴)
       - editingTemplateId/editingFtcTemplateId useState는 BloggerMasterApp에 그대로 유지(D-07)
       - closeTemplateModal은 editingTemplateId 리셋이 핵심이므로 BloggerMasterApp에 유지

    3. **CRITICAL 동등성**:
       - blogger_templates, blogger_ftc_templates 키 값 변경 금지
       - 템플릿 데이터 형태(id, title, content) 유지
       - 드래그 정렬(@dnd-kit) 코드는 건드리지 않음 — setTemplates를 그대로 호출하면 동작
       - PLAN_LIMITS 체크가 누락되지 않도록 wrapper에서 반드시 검증
  </action>
  <verify>
    <automated>npm run build &amp;&amp; npm run lint</automated>
  </verify>
  <acceptance_criteria>
    - useTemplates.js 50줄 이상, 위 12개 키 export
    - BloggerMasterApp에서 templates/ftcTemplates useState 제거
    - PLAN_LIMITS 체크 wrapper가 BloggerMasterApp에 존재 (Pitfall 3)
    - editingTemplateId, editingFtcTemplateId는 BloggerMasterApp에 유지
    - npm run build, npm run lint 통과
    - 수동 UAT:
      a. tool 탭 → 협찬 신청 문구 추가/수정/삭제 정상 동작
      b. FTC 문구 동일 동작
      c. 드래그로 순서 변경 후 새로고침 시 순서 유지
      d. 무료 플랜에서 템플릿 한도 초과 시 업그레이드 모달 표시
      e. localStorage `blogger_templates`/`blogger_ftc_templates` 키 형태 동일
  </acceptance_criteria>
  <done>useTemplates 추출 완료, PLAN_LIMITS 체크 wrapper 유지, 드래그/CRUD/플랜 제한 모두 회귀 없음.</done>
</task>

<task type="auto">
  <name>Task 2: useSchedules 훅 작성 + BloggerMasterApp 교체 (Supabase useEffect 유지)</name>
  <read_first>
    - src/BloggerMasterApp.jsx 라인 757~899 (schedules/savedTexts/Supabase 블록)
    - src/features/schedule/schemas.js
    - src/features/settings/schemas.js (savedTextsSchema)
  </read_first>
  <files>
    src/features/schedule/hooks/useSchedules.js,
    src/BloggerMasterApp.jsx
  </files>
  <action>
    1. src/features/schedule/hooks/useSchedules.js 작성:
       - imports: useState, useEffect, parseWithSchema, schedulesSchema, savedTextsSchema, STORAGE_KEYS
       - state:
         ```js
         const [schedules, setSchedules] = useState(() => {
           const parsed = parseWithSchema(schedulesSchema, localStorage.getItem(STORAGE_KEYS.SCHEDULES), [])
           // 기존 예시 데이터 필터링 로직 유지 (라인 827~838 참조)
           return parsed
         })
         const [savedTexts, setSavedTexts] = useState(() =>
           parseWithSchema(savedTextsSchema, localStorage.getItem(STORAGE_KEYS.SAVED_TEXTS), [])
         )
         ```
       - useEffect: schedules 변경 시 localStorage 저장 (라인 840 그대로 옮김)
       - useEffect: savedTexts 변경 시 localStorage 저장 (기존 패턴 따라)
       - functions:
         - `deleteSchedule(id)` — 라인 어딘가의 deleteSchedule 본체 옮김
         - 추가 helpers (addSchedule, updateSchedule)는 기존 코드에 명시적으로 없으면 만들지 않음 — schedules 직접 setSchedules로 처리하는 기존 패턴 유지
       - return: `{ schedules, setSchedules, savedTexts, setSavedTexts, deleteSchedule }`
       - **Supabase 복합 useEffect는 이 훅에 포함하지 않는다** (Pitfall 1 결정 per RESEARCH 라인 416~420)
       - **handleSmartParsing은 이 훅에 포함하지 않는다** — Gemini/모달 결합도 때문 BloggerMasterApp에 유지

    2. BloggerMasterApp.jsx 교체:
       - import 추가
       - 컴포넌트 본문에서 destructure 호출
       - 기존 schedules/savedTexts useState 선언 삭제 (라인 824, 762)
       - schedules 자동 저장 useEffect 삭제 (라인 840) — 훅으로 이동
       - **라인 848~882 Supabase 복합 useEffect는 그대로 유지** — 단, setSchedules/setSavedTexts/setProfile/setTemplates/setFtcTemplates/setHashtags 호출은 이제 모두 훅에서 받은 setter를 사용
       - **라인 885 debounce upsert useEffect도 그대로 유지** — 의존성 배열이 schedules, templates, profile 등인데 이제는 훅 반환값에서 받은 동일 변수
       - selectedScheduleId, isModalOpen, parsedData useState는 BloggerMasterApp에 유지(D-07)
       - handleSmartParsing 함수는 BloggerMasterApp에 유지
       - deleteSchedule 함수 본체 삭제 (훅으로 이동) — 호출부는 그대로 동작 (이름 동일)

    3. **CRITICAL 동등성 — Supabase 동기화 회귀 방지**:
       - 라인 848~882, 885의 useEffect 코드는 한 글자도 변경 금지 (의존성 배열, 본문, debounce 시간 모두)
       - blogSchedules, blogger_saved_texts 키 값 변경 금지
       - 예시 데이터 필터링 로직 동작 유지
       - 로그인 시 Supabase에서 데이터가 정상 로드되고, 변경 시 1.5초 debounce로 업로드 되어야 함
  </action>
  <verify>
    <automated>npm run build &amp;&amp; npm run lint</automated>
  </verify>
  <acceptance_criteria>
    - useSchedules.js 50줄 이상
    - BloggerMasterApp에서 schedules/savedTexts useState 제거
    - Supabase 복합 useEffect(load + upsert) 2개가 BloggerMasterApp에 변경 없이 유지됨 (git diff로 본문 변경 없음 확인)
    - selectedScheduleId, isModalOpen, parsedData는 BloggerMasterApp에 유지
    - handleSmartParsing은 BloggerMasterApp에 유지
    - npm run build, npm run lint 통과
    - **수동 UAT (회귀 검증의 핵심)**:
      a. 신규 사용자(localStorage 비움) 로그인 → Supabase user_data에서 schedules/templates/profile 로드되어 표시
      b. 스케줄 추가 → 1.5초 후 Supabase user_data에 upsert 확인 (Supabase 콘솔)
      c. 스케줄 수정/삭제 → 동일 동기화
      d. 저장된 글(savedTexts) 추가/삭제 동작
      e. Gemini 스마트 파싱 → 정상 동작
      f. localStorage `blogSchedules`, `blogger_saved_texts` 키 형태 동일
      g. home/schedule 탭 회귀 없음
  </acceptance_criteria>
  <done>useSchedules 추출 완료, Supabase 복합 useEffect 유지, 동기화 회귀 없음.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Supabase user_data → app state | 이미 인증된 RLS 보호 데이터. Plan 2 zod 검증이 useState lazy initializer 안에서 적용. |
| Gemini API 응답 → schedule state | Plan 2에서 geminiParsedSchema 도입 완료. handleSmartParsing이 그 검증을 사용. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-05-01 | Tampering | localStorage blogSchedules, blogger_templates 손상 | mitigate | parseWithSchema가 훅 lazy initializer에서 검증 (Plan 2 결과). 손상 시 빈 배열 fallback. |
| T-01-05-02 | DoS (회귀) | Supabase 복합 useEffect 분리 시 N+1 fetch | mitigate | 의도적 결정: 복합 useEffect를 BloggerMasterApp에 유지. Phase 2에서 테이블 분리 후 자연 해소. |
| T-01-05-03 | Privilege escalation | PLAN_LIMITS 우회 (템플릿 한도 무시) | mitigate | useTemplates는 순수 CRUD만 제공, 플랜 체크는 BloggerMasterApp wrapper에서 강제 (Pitfall 3). |
</threat_model>

<verification>
- npm run build, npm run lint 통과
- BloggerMasterApp.jsx 라인 수 추가 감소 (~150줄 이상)
- Supabase 복합 useEffect 본문 git diff 변경 없음 (의도된 변경: 호출하는 setter가 훅에서 옴)
- 수동 UAT 모든 항목 통과
- localStorage 키 5개(templates, ftc_templates, schedules, saved_texts, hashtags) 형태 동일
</verification>

<success_criteria>
- STATE-01 추가 충족: useTemplates, useSchedules 추출
- STATE-02 부분 충족: useTemplates는 완전 소유, useSchedules는 단순 상태 + localStorage 소유, Supabase 동기화는 의도적으로 컴포넌트에 유지
- 사용자 경험 동등성: CRUD, 드래그, 동기화, 플랜 제한 모두 회귀 없음
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-05-SUMMARY.md` documenting:
- 추출된 라인 매핑
- Pitfall 1/3 처리 방식 (Supabase useEffect 유지, PLAN_LIMITS wrapper)
- BloggerMasterApp.jsx 라인 수 변화
- Plan 6 useGoogleCalendar 추출 시 참고할 패턴
</output>
