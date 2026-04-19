---
phase: 260419-tce-ui
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/BloggerMasterApp.jsx
autonomous: false
requirements:
  - UI-TCE-01  # 배지/버튼 줄 폰트 축소 (text-[10px] → text-[9px])
  - UI-TCE-02  # 기본정보·일정정보 박스 패딩 축소 (p-3 → p-2.5)
  - UI-TCE-03  # 키워드 박스 패딩 축소 (px-5 py-3 → px-4 py-2.5)

must_haves:
  truths:
    - "스케줄 상세 카드 2행의 브랜드·카테고리·플랫폼 배지와 신청문구·메모 버튼 라벨이 한 단계 더 작게 보인다"
    - "기본정보 박스(주소·연락처·제공)와 일정정보 박스(체험기간·리뷰마감·가능요일·가능시간)의 내부 여백이 이전보다 약간 줄어든다"
    - "키워드 박스의 좌우·상하 여백이 이전보다 약간 줄어든다"
    - "모든 데이터, 클릭 동작, 상태, 조건부 렌더링 로직은 변경되지 않는다"
    - "기존에 표시되던 텍스트가 줄바꿈·잘림 없이 그대로 노출된다 (whitespace-nowrap 유지)"
  artifacts:
    - path: "src/BloggerMasterApp.jsx"
      provides: "스케줄 상세 모달 카드의 컴팩트한 레이아웃"
      contains: "text-[9px], p-2.5, px-4 py-2.5"
  key_links:
    - from: "스케줄 상세 카드 2행 (라인 3052-3072 근처)"
      to: "배지·버튼 7개 요소의 text-[10px]"
      via: "text-[9px]로 일괄 치환"
      pattern: "text-\\[9px\\]"
    - from: "기본정보 박스 3개 (라인 3216-3243 근처)"
      to: "주소 a·복사 버튼·연락처 a·복사·SMS·제공내역"
      via: "p-3 → p-2.5"
      pattern: "p-2\\.5"
    - from: "일정정보 박스 4개 (라인 3250-3274 근처)"
      to: "체험기간·리뷰마감·가능요일·가능시간 카드"
      via: "p-3 → p-2.5"
      pattern: "p-2\\.5"
    - from: "키워드 박스 (라인 3278-3287 근처)"
      to: "px-5 py-3 → px-4 py-2.5"
      via: "className 치환"
      pattern: "px-4 py-2\\.5"
---

<objective>
스케줄 상세 모달 카드의 시각적 밀도를 소폭 높인다. 리뷰어 스크린샷 피드백에 따라 (1) 배지/액션 버튼 줄의 글씨를 `text-[10px]` → `text-[9px]`로, (2) 기본정보·일정정보 박스의 `p-3` → `p-2.5`로, (3) 키워드 박스의 `px-5 py-3` → `px-4 py-2.5`로 축소한다.

Purpose: 카드 상단 배지 줄이 시각적으로 과하게 크지 않도록, 정보 박스가 과하게 넓지 않도록 레이아웃을 다듬는다. 로직·데이터·인터랙션 변경 없음, 순수 Tailwind 유틸리티 클래스 교체.
Output: `src/BloggerMasterApp.jsx` 한 파일의 국소적 className 변경.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

<!--
제약:
- 기능 동등성 100% 유지 (CLAUDE.md Constraints)
- React 19 + Vite + Tailwind 스택 유지
- 이 작업은 `/gsd-quick` 경량 플로우, 로직 변경 금지
-->

<interfaces>
영향 받는 JSX 영역 — `src/BloggerMasterApp.jsx` 스케줄 상세 모달 렌더링 블록 (현재 HEAD 기준 라인 3040~3290).

대상 1: 배지/버튼 줄 (라인 3052-3072 `{/* 2행: 브랜드·카테고리·플랫폼 배지 + 신청문구·메모 */}`)
  - 라인 3055 브랜드 배지 `text-[10px]`
  - 라인 3057 카테고리 텍스트 `text-[10px]`
  - 라인 3059 플랫폼 배지 `text-[10px]`
  - 라인 3065 신청문구 버튼 `text-[10px]`
  - 라인 3068 체험메모 버튼 `text-[10px]`
  (전부 동일 2행 블록 안의 `text-[10px]` → `text-[9px]`)

대상 2: 기본정보 박스 (라인 3214-3245 `{/* 기본 정보 */}`)
  - 라인 3218 주소 a `p-3`
  - 라인 3222 주소 복사 button `p-3`
  - 라인 3229 연락처 a `p-3`
  - 라인 3232 연락처 복사 button `p-3`
  - 라인 3235 SMS a `p-3`
  - 라인 3241 제공내역 div `p-3`
  (전부 `p-3` → `p-2.5`)

대상 3: 일정정보 박스 (라인 3247-3275 `{/* 일정 정보 */}`)
  - 라인 3251 체험기간 `p-3`
  - 라인 3257 리뷰마감 `p-3`
  - 라인 3264 가능요일 `p-3`
  - 라인 3270 가능시간 `p-3`
  (전부 `p-3` → `p-2.5`)

대상 4: 키워드 박스 (라인 3278-3288)
  - 라인 3279 `px-5 py-3` → `px-4 py-2.5`

범위 밖 (변경 금지):
  - 라인 3076 D-day 배지 `text-[10px]` — 3행, 다른 줄
  - 라인 3081, 3087, 3094, 3098, 3124 버튼들 `text-[11px]` — 다른 행
  - 라인 3133 수정 모드 블록 `p-5`
  - 라인 3134, 3280, 3294 등 `text-[10px] font-black` 레이블 — 배지 2행 밖
  - 그 외 `p-3`이 붙은 모든 요소 (편집 모드 input 등) — 이 플랜과 무관
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 배지/버튼 줄 폰트를 text-[9px]로 축소</name>
  <files>src/BloggerMasterApp.jsx</files>
  <action>
`src/BloggerMasterApp.jsx`의 스케줄 상세 모달 "2행: 브랜드·카테고리·플랫폼 배지 + 신청문구·메모" 블록(현재 HEAD 기준 라인 3052-3072, `{/* 2행: 브랜드·카테고리·플랫폼 배지 + 신청문구·메모 */}` 주석으로 시작)에서 해당 블록 내부의 `text-[10px]`을 모두 `text-[9px]`로 치환한다.

변경 대상 5곳 (순서대로):
1. 라인 3055 `<span className={`px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${getBrandBadge(item.brand)}`}>` → `text-[9px]`
2. 라인 3057 `<span className="text-[10px] font-bold text-sky-500 whitespace-nowrap">` → `text-[9px]`
3. 라인 3059 `<span key={p} className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-500 border border-sky-100 whitespace-nowrap">` → `text-[9px]`
4. 라인 3065 `<button onClick={() => setShowTemplatePickerId(item.id)} className="text-[10px] font-black text-emerald-600 flex items-center gap-0.5 px-2 py-1 rounded-full bg-emerald-50 active:scale-95 transition-all whitespace-nowrap">` → `text-[9px]`
5. 라인 3068 `<button onClick={() => setNotePopupId(item.id)} className={`text-[10px] font-black flex items-center gap-0.5 px-2 py-1 rounded-full active:scale-95 transition-all whitespace-nowrap ${item.experienceNote ? 'bg-violet-500 text-white' : 'bg-violet-100 text-violet-500'}`}>` → `text-[9px]`

주의 (변경하지 말 것):
- 라인 3076 D-day 배지의 `text-[10px]` — 3행이므로 제외
- `text-[10px] font-black text-sky-500 uppercase tracking-widest` (수정 모드 헤더 등) — 2행 밖
- 다른 섹션의 모든 `text-[10px]`

Grep/Read로 정확한 라인 위치를 먼저 확인한 후, Edit 도구로 5개 요소를 개별 치환한다. 전체 파일 일괄 치환(sed/awk) 금지 — 같은 클래스 조합이 파일 내 다른 곳에도 존재할 수 있다.
  </action>
  <verify>
    <automated>grep -n "text-\[10px\]" src/BloggerMasterApp.jsx | sed -n '1,10p' | awk -F: '$2 &gt;= 3052 && $2 &lt;= 3072 { print "FAIL line "$2; exit 1 } END { print "PASS" }'</automated>
  </verify>
  <done>2행 블록(라인 3052-3072) 내부에 `text-[10px]`이 0개이고 `text-[9px]`이 5개 존재한다. 다른 영역의 `text-[10px]`은 그대로 남아 있다.</done>
</task>

<task type="auto">
  <name>Task 2: 기본정보·일정정보 박스 패딩을 p-2.5로 축소</name>
  <files>src/BloggerMasterApp.jsx</files>
  <action>
`src/BloggerMasterApp.jsx`의 "기본 정보" 블록(라인 3214-3245, `{/* 기본 정보 */}` 주석)과 "일정 정보" 블록(라인 3247-3275, `{/* 일정 정보 */}` 주석) 내부의 `p-3`을 모두 `p-2.5`로 치환한다.

변경 대상 총 10곳:

기본 정보 (6곳):
- 라인 3218 주소 `<a ... className="flex-1 flex items-start gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl ...">`
- 라인 3222 주소 복사 `<button ... className="p-3 bg-slate-50 rounded-2xl ...">`
- 라인 3229 연락처 `<a ... className="flex-1 flex items-center gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl ...">`
- 라인 3232 연락처 복사 `<button ... className="p-3 bg-slate-50 rounded-2xl ...">`
- 라인 3235 SMS `<a ... className="p-3 bg-emerald-50 rounded-2xl ...">`
- 라인 3241 제공내역 `<div className="flex items-start gap-3 text-xs text-slate-600 bg-emerald-50 p-3 rounded-2xl border border-emerald-100">`

일정 정보 (4곳):
- 라인 3251 체험기간 `<div className="bg-blue-50 p-3 rounded-xl border border-blue-100">`
- 라인 3257 리뷰마감 `<div className="bg-rose-50 p-3 rounded-xl border border-rose-100">`
- 라인 3264 가능요일 `<div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">`
- 라인 3270 가능시간 `<div className="bg-amber-50 p-3 rounded-xl border border-amber-100">`

각 `p-3`을 `p-2.5`로 교체. Edit 도구로 각 라인을 개별 치환 (문맥 포함 매칭). 수정 모드(`isEditing`) 블록 내부의 `p-3` 및 다른 섹션의 `p-3`은 건드리지 않는다.

확인 포인트:
- 모든 대상 요소는 `!isEditing` 브랜치 안에 있다 (라인 3215 `{!isEditing && <>...`).
- `gap-3`은 flex/grid gap이며 변경 대상 아님.
- `rounded-2xl` / `rounded-xl` 클래스는 그대로 유지.
  </action>
  <verify>
    <automated>node -e "const s=require('fs').readFileSync('src/BloggerMasterApp.jsx','utf8').split('\n'); let p25=0,p3=0; for(let i=3214;i&lt;=3274;i++){const l=s[i-1]||'';if(/\bp-2\.5\b/.test(l))p25++;if(/\bp-3\b/.test(l))p3++;} if(p3&gt;0){console.error('FAIL: p-3 still present in target range, count='+p3);process.exit(1);} if(p25&lt;10){console.error('FAIL: expected &gt;=10 p-2.5, got '+p25);process.exit(1);} console.log('PASS p-2.5='+p25+' p-3='+p3);"</automated>
  </verify>
  <done>라인 3214-3274 범위 안에서 `p-3`이 0개이고 `p-2.5`이 10개 이상이다. 다른 영역의 `p-3`(예: 수정 모드 블록)은 그대로 남아 있다.</done>
</task>

<task type="auto">
  <name>Task 3: 키워드 박스 패딩을 px-4 py-2.5로 축소 + 빌드 검증</name>
  <files>src/BloggerMasterApp.jsx</files>
  <action>
`src/BloggerMasterApp.jsx` 라인 3278-3288의 키워드 박스에서:

변경 전 (라인 3279):
```jsx
<div className="bg-violet-50/60 rounded-2xl border border-dashed border-violet-200 px-5 py-3">
```

변경 후:
```jsx
<div className="bg-violet-50/60 rounded-2xl border border-dashed border-violet-200 px-4 py-2.5">
```

`px-5 py-3`만 `px-4 py-2.5`로 교체. 나머지 클래스·자식 요소(레이블, 키워드 텍스트, 복사 버튼)는 그대로 유지.

주의: 같은 파일 내 "기타 정보" 블록(라인 3292-3296 근처)의 `px-5 py-3`은 변경 대상이 아니다. 라인 3279의 키워드 박스 `<div>`만 바꾼다.

모든 수정이 끝나면 빌드 검증을 실행한다:
```bash
npm run lint 2>&1 | tail -20
npm run build 2>&1 | tail -20
```
린트 에러·빌드 에러가 없어야 한다.
  </action>
  <verify>
    <automated>grep -n 'px-4 py-2\.5' src/BloggerMasterApp.jsx &amp;&amp; grep -n 'bg-violet-50/60 rounded-2xl border border-dashed border-violet-200 px-5 py-3' src/BloggerMasterApp.jsx &amp;&amp; echo FAIL || echo PASS; npm run build 2&gt;&amp;1 | tail -5</automated>
  </verify>
  <done>키워드 박스의 `<div>`가 `px-4 py-2.5`를 사용한다. 파일 내에서 해당 div의 `px-5 py-3`은 제거되었고, 다른 영역(기타 정보 등)의 `px-5 py-3`은 남아 있다. `npm run build`가 성공한다.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: 수동 UI 확인 — 스케줄 상세 카드 외견 검증</name>
  <what-built>
    - 2행 배지/버튼 글씨: `text-[10px]` → `text-[9px]`
    - 기본정보·일정정보 박스 패딩: `p-3` → `p-2.5`
    - 키워드 박스: `px-5 py-3` → `px-4 py-2.5`
    - 데이터·클릭 동작·조건부 렌더링 로직은 변경 없음
  </what-built>
  <how-to-verify>
1. `npm run dev` 실행 후 blue-review.com 로컬 주소 접속
2. 로그인 → 캘린더 탭에서 기존 스케줄 아이템 하나를 탭하여 상세 모달 열기
3. 다음 항목을 스크린샷 기준과 비교해 확인:
   - 2행의 브랜드 배지 / 카테고리 텍스트 / 플랫폼 배지 / "신청문구" 버튼 / "체험메모" 버튼 글씨가 이전보다 한 단계 작아졌는가
   - 주소·연락처·제공내역 박스의 상하 여백이 이전보다 살짝 줄었는가
   - 체험기간·리뷰마감·가능요일·가능시간 그리드 카드의 안쪽 여백이 이전보다 살짝 줄었는가
   - 키워드 박스(보라색)의 좌우·상하 여백이 이전보다 줄었는가
   - 텍스트가 잘리거나 줄바꿈되는 곳은 없는가 (whitespace-nowrap 유지 확인)
4. 인터랙션 스모크:
   - 수정(Pencil) 버튼 클릭 → 편집 모드 진입 정상
   - 삭제(Trash2) 버튼 클릭 → 삭제 확인 다이얼로그 정상
   - "신청문구" 클릭 → 템플릿 선택 UI 정상
   - "체험메모" 클릭 → 메모 팝업 정상
   - 주소 `<a>` 클릭 → 네이버 지도 새 탭, 복사 버튼 동작
   - 수정 모드는 이번 변경 대상 아님 — 기존과 동일해야 함
5. D-day 배지(3행)와 일정 버튼(4행)은 글씨 크기가 **변하지 않아야** 한다 — 변경 범위 밖
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- 2행 블록(라인 3052-3072) 내부에 `text-[10px]` 이 0개
- 기본정보+일정정보 블록(라인 3214-3274) 내부에 `p-3` 이 0개, `p-2.5` 가 10개 이상
- 키워드 박스 `<div>`에 `px-4 py-2.5` 존재
- `npm run build` 성공
- 수동 UI 확인 통과
</verification>

<success_criteria>
사용자가 스케줄 상세 모달을 열었을 때 배지 줄과 정보 박스·키워드 박스가 이전보다 소폭 컴팩트해진 것이 즉시 눈에 띈다. 그 외 모든 데이터, 클릭 동작, 조건부 UI, 텍스트 줄바꿈/잘림 상태가 동일하다. 빌드와 린트가 통과한다.
</success_criteria>

<output>
After completion, create `.planning/quick/260419-tce-ui/260419-tce-SUMMARY.md` recording:
- 실제 수정된 라인 번호 (HEAD 기준)
- 변경 전/후 className 스니펫
- 수동 검증 결과
- 스코프 밖이었지만 확인한 영역 (D-day 배지, 일정 버튼 등)
</output>
