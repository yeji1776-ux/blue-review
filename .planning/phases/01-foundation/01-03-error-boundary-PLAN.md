---
phase: 01-foundation
plan: 03
type: execute
wave: 2
depends_on: [01]
files_modified:
  - src/components/ui/ErrorBoundary.jsx
  - src/App.jsx
  - src/BloggerMasterApp.jsx
autonomous: false
requirements: [INFRA-01]
must_haves:
  truths:
    - "src/components/ui/ErrorBoundary.jsx가 react-error-boundary 기반으로 구현되고 한국어 fallback UI를 제공한다"
    - "App 루트, Calendar 영역, Templates 영역 3곳에 ErrorBoundary가 적용된다"
    - "한 영역에서 에러가 발생해도 앱 전체가 크래시하지 않고 fallback UI만 표시된다"
    - "fallback UI의 '다시 시도' 버튼이 ErrorBoundary를 reset한다"
    - "fallback UI 디자인이 jelly-card / sky 팔레트와 톤이 맞는다"
  artifacts:
    - path: "src/components/ui/ErrorBoundary.jsx"
      provides: "AppErrorBoundary 컴포넌트"
      exports: ["AppErrorBoundary"]
  key_links:
    - from: "src/App.jsx"
      to: "src/components/ui/ErrorBoundary.jsx"
      via: "AppErrorBoundary 래핑"
      pattern: "AppErrorBoundary"
    - from: "src/BloggerMasterApp.jsx"
      to: "src/components/ui/ErrorBoundary.jsx"
      via: "Calendar/Templates 영역 래핑"
      pattern: "AppErrorBoundary"
---

<objective>
react-error-boundary 기반 공통 ErrorBoundary 컴포넌트를 만들고 3개 위치에 적용한다 (INFRA-01, D-08~D-11).

Purpose: Calendar/Templates 영역에서 런타임 에러가 발생해도 앱 전체가 흰 화면으로 크래시하지 않게 한다. Phase 1 인프라의 마지막 안전망.
Output: ErrorBoundary 컴포넌트 1개, App.jsx 루트 적용, BloggerMasterApp 내 Calendar/Templates 영역 래핑.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/phases/01-foundation/01-RESEARCH.md
@CLAUDE.md
@src/App.jsx
@src/BloggerMasterApp.jsx
@src/index.css

<interfaces>
react-error-boundary API (RESEARCH 라인 220~250):
```jsx
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'
<ReactErrorBoundary FallbackComponent={Fallback} onError={(err) => ...} onReset={() => ...}>
```

적용 위치 (RESEARCH 라인 252~276):
- src/App.jsx — 루트 ErrorBoundary
- BloggerMasterApp.jsx 라인 ~2485 근처 — Calendar 탭 (`activeTab === 'calendar'` 블록)
- BloggerMasterApp.jsx 라인 ~2209 근처 — Templates는 'tool' 탭 블록

기존 디자인 토큰 (src/index.css):
- `.jelly-card` — 카드 (gradient + glassmorphism)
- `sky-50/100/200/500` 팔레트, `slate-400/600` 텍스트
- `active:scale-95 transition-all` — 버튼 인터랙션 패턴
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: ErrorBoundary 컴포넌트 작성 + App 루트 적용</name>
  <read_first>
    - .planning/phases/01-foundation/01-RESEARCH.md (라인 215~276)
    - src/App.jsx
    - src/index.css (jelly-card 스타일 확인)
  </read_first>
  <files>
    src/components/ui/ErrorBoundary.jsx,
    src/App.jsx
  </files>
  <action>
    1. src/components/ui/ErrorBoundary.jsx 작성:
       - react-error-boundary의 `ErrorBoundary as ReactErrorBoundary` import
       - 내부 `FallbackComponent({ error, resetErrorBoundary })`:
         - jelly-card 컨테이너, 한국어 메시지 (D-09)
         - 제목: '이 영역에서 오류가 발생했어요.' (text-sm font-bold text-slate-600)
         - 에러 메시지: `error.message` (text-xs text-slate-400, break-words)
         - '다시 시도' 버튼 (sky-500, rounded-xl, active:scale-95) → resetErrorBoundary 호출
         - padding/spacing: jelly-card p-6 space-y-3, text-center
       - `export function AppErrorBoundary({ children, onReset })`:
         - ReactErrorBoundary로 children 래핑
         - FallbackComponent prop 전달
         - `onError={(error, info) => console.error('[ErrorBoundary]', error, info)}` (D-11)
         - `onReset` prop을 받아 그대로 전달 (호출자가 영역별 reset 로직 주입 가능)
       - 코드 스타일: 2-space indent, single quotes, 세미콜론 없음.

    2. src/App.jsx 수정:
       ```jsx
       import BloggerMasterApp from './BloggerMasterApp'
       import { AppErrorBoundary } from './components/ui/ErrorBoundary'

       function App() {
         return (
           <AppErrorBoundary>
             <BloggerMasterApp />
           </AppErrorBoundary>
         )
       }

       export default App
       ```
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <acceptance_criteria>
    - src/components/ui/ErrorBoundary.jsx 존재, AppErrorBoundary export
    - App.jsx가 BloggerMasterApp을 AppErrorBoundary로 감쌈
    - npm run build 통과
    - fallback UI에 한국어 텍스트, jelly-card 클래스, sky-500 버튼 사용
  </acceptance_criteria>
  <done>ErrorBoundary 컴포넌트 작성 + 루트 적용 완료, 빌드 통과.</done>
</task>

<task type="auto">
  <name>Task 2: BloggerMasterApp 내 Calendar/Templates 영역 ErrorBoundary 래핑</name>
  <read_first>
    - src/BloggerMasterApp.jsx (Grep으로 `activeTab === 'calendar'`, `activeTab === 'tool'` 위치 정확히 찾기)
    - .planning/phases/01-foundation/01-RESEARCH.md (라인 264~276)
  </read_first>
  <files>src/BloggerMasterApp.jsx</files>
  <action>
    1. 상단 import 추가:
       ```js
       import { AppErrorBoundary } from './components/ui/ErrorBoundary'
       ```

    2. **Calendar 영역 래핑** — Grep `activeTab === 'calendar'`로 정확한 라인 찾기 (research는 ~2485 추정).
       해당 블록 전체를 AppErrorBoundary로 감싼다:
       ```jsx
       {activeTab === 'calendar' && (
         <AppErrorBoundary key="calendar">
           {/* 기존 Calendar JSX 그대로 */}
         </AppErrorBoundary>
       )}
       ```
       `key="calendar"` 필수 — tab 전환 시 boundary state 초기화.

    3. **Templates 영역 래핑** — Templates는 `activeTab === 'tool'` 블록에 위치 (research 라인 273). Grep으로 정확한 라인 찾고 동일 패턴으로 감싼다:
       ```jsx
       {activeTab === 'tool' && (
         <AppErrorBoundary key="tool">
           {/* 기존 tool 탭 JSX 그대로 */}
         </AppErrorBoundary>
       )}
       ```

    4. **CRITICAL — 기존 JSX 구조 변경 금지**:
       - 다른 탭(home, schedule, profile)은 절대 건드리지 않는다 (D-10: Phase 1은 3곳만)
       - 기존 className, props, 이벤트 핸들러 변경 없음
       - AppErrorBoundary가 추가됨으로 인한 들여쓰기 외 모든 변경 금지

    5. 코드 스타일: 2-space indent, single quotes, 세미콜론 없음.
  </action>
  <verify>
    <automated>npm run build &amp;&amp; npm run lint</automated>
  </verify>
  <acceptance_criteria>
    - BloggerMasterApp.jsx 상단에 AppErrorBoundary import 추가
    - `activeTab === 'calendar'` 블록과 `activeTab === 'tool'` 블록이 AppErrorBoundary로 래핑됨
    - 각 boundary에 `key` prop이 있음 (탭 전환 시 reset)
    - npm run build, npm run lint 통과
    - home/schedule/profile 탭의 JSX 변경 없음 (git diff 확인)
  </acceptance_criteria>
  <done>Calendar/Templates 영역에 ErrorBoundary 적용 완료, 빌드/린트 통과.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Checkpoint: ErrorBoundary 동작 수동 검증</name>
  <what-built>
    - src/components/ui/ErrorBoundary.jsx (AppErrorBoundary 컴포넌트)
    - App 루트, Calendar 탭, Tool(Templates) 탭에 ErrorBoundary 적용
    - jelly-card 톤의 한국어 fallback UI (다시 시도 버튼)
  </what-built>
  <how-to-verify>
    1. `npm run dev`로 앱 실행, 브라우저에서 로그인
    2. **정상 동작 확인**:
       - 모든 탭(home, schedule, calendar, tool, profile)을 순회하며 기존과 동일하게 동작하는지 확인
       - 스케줄 추가/삭제, 템플릿 편집, Google Calendar 영역 표시 등 기존 기능 모두 동작
    3. **에러 시뮬레이션 (Calendar 영역)**:
       - DevTools Console에서 임시로 BloggerMasterApp의 Calendar 렌더링 함수에 `throw new Error('test')` 추가, 또는
       - React DevTools로 Calendar 컴포넌트 prop을 손상시켜 에러 유도
       - 기대 결과: Calendar 탭만 fallback UI 표시, 다른 탭(home/schedule)은 정상 동작, 다시 시도 버튼 클릭 시 reset
    4. **에러 시뮬레이션 (Templates 영역)**: 동일 방식으로 tool 탭에서 에러 유도, fallback UI 확인
    5. **fallback UI 디자인 확인**:
       - jelly-card 톤 (gradient/glassmorphism), sky-500 버튼, slate 텍스트
       - 한국어 메시지 표시
       - 다시 시도 버튼이 active:scale-95 인터랙션
    6. **localStorage 키 sanity check**:
       - DevTools Application → Local Storage에서 `blogger_profile`, `blogger_templates`, `blogSchedules` 등 키가 기존 형태 그대로 유지되는지 확인
       - 키 이름이 한 글자도 변경되지 않았는지 확인
    7. **다른 탭 회귀**: home/schedule/profile 탭이 모두 정상 동작
  </how-to-verify>
  <resume-signal>"approved" 입력 또는 발견된 이슈 설명</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 컴포넌트 렌더링 → React 트리 | 자식 컴포넌트의 렌더 에러가 현재는 전체 트리를 unmount함. ErrorBoundary가 격리 경계 도입. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-03-01 | Denial of Service | Calendar/Templates 렌더 에러로 앱 전체 크래시 | mitigate | react-error-boundary로 영역 격리. 한 영역 에러가 다른 영역에 영향 없음 (D-08, D-10). |
| T-01-03-02 | Information Disclosure | error.message에 민감 정보 노출 가능성 | accept | 현재 코드에서 throw하는 에러는 모두 개발자 메시지 또는 라이브러리 메시지. PII 포함 throw 패턴 없음. console.error로만 추가 로깅(D-11), 원격 전송 없음. |
</threat_model>

<verification>
- npm run build, npm run lint 통과
- ErrorBoundary 3곳 적용 (App 루트, Calendar, Templates) — Grep으로 AppErrorBoundary 사용처 3개 이상 확인
- 수동 UAT (Task 3 checkpoint)에서 fallback UI 동작 확인
- localStorage 키 변경 없음 (git diff 확인)
</verification>

<success_criteria>
- INFRA-01 충족: App 루트 + Calendar + Templates 3곳에 ErrorBoundary 적용
- 한 영역 에러가 다른 영역으로 전파되지 않음 (격리 검증)
- jelly-card 톤의 한국어 fallback UI (D-09)
- 사용자 경험 동등성: 정상 동작 시 차이 없음
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-03-SUMMARY.md` documenting:
- ErrorBoundary 적용 위치 라인
- 수동 에러 시뮬레이션 결과
- Phase 3에서 Screen별 세분화 적용을 위한 가이드 (deferred from D-10)
</output>
