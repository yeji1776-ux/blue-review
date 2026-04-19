---
phase: 260419-tce-ui
plan: 01
subsystem: ui
tags: [tailwind, css-utility, compact-layout, no-logic-change]
requires: []
provides:
  - 스케줄 상세 모달 카드의 컴팩트 레이아웃 (배지 줄 text-[9px], 정보 박스 p-2.5, 키워드 박스 px-4 py-2.5)
affects:
  - src/BloggerMasterApp.jsx 스케줄 상세 모달 렌더링 블록
tech_stack:
  added: []
  patterns:
    - Tailwind utility-class 교체 (순수 CSS 축소)
key_files:
  created: []
  modified:
    - src/BloggerMasterApp.jsx
decisions:
  - "순수 CSS 유틸리티 수정만 수행. 로직/데이터/조건부 렌더링 변경 금지"
  - "스코프 밖 p-3, text-[10px], px-5 py-3 은 의도적으로 그대로 유지 (수정 모드, 다른 섹션)"
  - "Task 4 수동 검증은 constraints에 따라 blocking 하지 않고 사용자 수동 확인으로 위임"
metrics:
  duration_min: 1
  completed_at: 2026-04-19T12:12:25Z
  tasks_total: 4
  tasks_auto_complete: 3
  tasks_pending_manual: 1
---

# Phase 260419-tce-ui Plan 01: Schedule Detail Compact Tweaks Summary

**One-liner:** 스케줄 상세 모달의 2행 배지/버튼 글씨(`text-[10px]→text-[9px]`), 기본·일정정보 박스 패딩(`p-3→p-2.5`), 키워드 박스 패딩(`px-5 py-3→px-4 py-2.5`)을 일괄 축소하는 순수 Tailwind 유틸리티 치환.

## What Changed

스케줄 상세 모달 카드의 시각적 밀도를 소폭 높여 배지 줄이 과하게 크지 않도록, 정보 박스가 과하게 넓지 않도록 다듬었다. 데이터·인터랙션·조건부 렌더링 로직은 변경하지 않았다.

## Tasks Executed

| Task | Name | Status | Commit | Files |
|------|------|--------|--------|-------|
| 1 | 배지/버튼 줄 폰트 `text-[10px]`→`text-[9px]` | done | `6d504a5` | src/BloggerMasterApp.jsx |
| 2 | 기본·일정정보 박스 패딩 `p-3`→`p-2.5` | done | `97215cf` | src/BloggerMasterApp.jsx |
| 3 | 키워드 박스 패딩 `px-5 py-3`→`px-4 py-2.5` + 빌드 검증 | done | `dbac3e1` | src/BloggerMasterApp.jsx |
| 4 | 수동 UI 확인 (checkpoint:human-verify) | pending-manual | — | — |

## Exact Line Changes (HEAD @ post-commit)

### Task 1 — 2행 배지/버튼 줄 (라인 3055~3068)

| Line | Before | After |
|------|--------|-------|
| 3055 | `px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${getBrandBadge(item.brand)}` | `... text-[9px] ...` |
| 3057 | `text-[10px] font-bold text-sky-500 whitespace-nowrap` | `text-[9px] font-bold text-sky-500 whitespace-nowrap` |
| 3059 | `px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-500 border border-sky-100 whitespace-nowrap` | `... text-[9px] ...` |
| 3065 | `text-[10px] font-black text-emerald-600 ... (신청문구 버튼)` | `text-[9px] font-black text-emerald-600 ...` |
| 3068 | `text-[10px] font-black ... (체험메모 버튼 템플릿)` | `text-[9px] font-black ...` |

### Task 2 — 기본정보 + 일정정보 박스 (라인 3218~3270)

| Line | Element | Before | After |
|------|---------|--------|-------|
| 3218 | 주소 `<a>` | `... bg-slate-50 p-3 rounded-2xl ...` | `... p-2.5 ...` |
| 3222 | 주소 복사 `<button>` | `p-3 bg-slate-50 rounded-2xl ...` | `p-2.5 ...` |
| 3229 | 연락처 `<a>` | `... bg-slate-50 p-3 rounded-2xl ...` | `... p-2.5 ...` |
| 3232 | 연락처 복사 `<button>` | `p-3 bg-slate-50 rounded-2xl ...` | `p-2.5 ...` |
| 3235 | SMS `<a>` | `p-3 bg-emerald-50 rounded-2xl ...` | `p-2.5 ...` |
| 3241 | 제공내역 `<div>` | `... bg-emerald-50 p-3 rounded-2xl ...` | `... p-2.5 ...` |
| 3251 | 체험기간 `<div>` | `bg-blue-50 p-3 rounded-xl ...` | `bg-blue-50 p-2.5 ...` |
| 3257 | 리뷰마감 `<div>` | `bg-rose-50 p-3 rounded-xl ...` | `bg-rose-50 p-2.5 ...` |
| 3264 | 가능요일 `<div>` | `bg-indigo-50 p-3 rounded-xl ...` | `bg-indigo-50 p-2.5 ...` |
| 3270 | 가능시간 `<div>` | `bg-amber-50 p-3 rounded-xl ...` | `bg-amber-50 p-2.5 ...` |

### Task 3 — 키워드 박스 (라인 3279)

| Line | Before | After |
|------|--------|-------|
| 3279 | `bg-violet-50/60 rounded-2xl border border-dashed border-violet-200 px-5 py-3` | `... px-4 py-2.5` |

## Verification Results

### Automated

- Task 1 grep: `text-[10px]` in 2행 블록(라인 3052-3072) → 0 occurrences. `text-[9px]` → 5 occurrences. PASS
- Task 2 node script: 라인 3214~3274 범위에서 `p-3` → 0, `p-2.5` → 10. PASS
- Task 3 grep: 키워드 박스 `<div>` 에 `px-4 py-2.5` 존재, `px-5 py-3` 제거됨. PASS
- `npm run build`: 성공 (vite v8.0.0, 1865 modules, 387ms)

### Manual (Task 4 — Pending)

사용자가 직접 로컬 dev 서버(`npm run dev`)에서 다음을 확인해야 합니다:

1. 캘린더 탭 → 스케줄 상세 모달 열기
2. 2행 브랜드/카테고리/플랫폼 배지 + 신청문구/체험메모 버튼 글씨가 한 단계 작아졌는지
3. 주소·연락처·제공내역 박스 패딩이 이전보다 약간 줄었는지
4. 체험기간/리뷰마감/가능요일/가능시간 그리드 카드 패딩이 줄었는지
5. 키워드 박스(보라색 dashed) 좌우·상하 여백이 줄었는지
6. 텍스트 줄바꿈·잘림 없음(`whitespace-nowrap` 유지)
7. 인터랙션 스모크: Pencil/Trash2/신청문구/체험메모 버튼, 주소 `<a>`, 복사 버튼 동작 정상
8. D-day 배지(3행), 일정 버튼(4행) 글씨 크기 불변 (스코프 밖)

## Out-of-Scope Verified Preserved

다음 영역은 의도적으로 건드리지 않았고 grep으로 잔존 확인:

- 라인 3076 D-day 배지 `text-[10px]` — 유지
- 라인 3081, 3087, 3094, 3098, 3124 일정 버튼 `text-[11px]` — 유지
- 라인 3133 수정 모드 블록 `p-5` — 유지
- 라인 3134, 3148, 3160, 3182, 3193 수정 모드 레이블 `text-[10px]` — 유지
- 라인 3280 키워드 레이블 `text-[10px] font-black text-violet-400` — 유지 (박스 내부 `<p>`, 박스 자체만 패딩 교체)
- 라인 3292-3296 기타 정보 블록 `px-5 py-3` — 유지
- 파일 전체의 다른 섹션에 있는 `p-3`, `text-[10px]`, `px-5 py-3` — 전부 유지

## Deviations from Plan

None — plan executed exactly as written. Three auto tasks committed atomically; Task 4 (human-verify) 는 quick-task constraints 에 따라 blocking 하지 않고 수동 확인 항목으로 이관.

## Scope Boundary Notes

- `npm run lint` 실행 시 기존 66 problems (52 errors, 14 warnings)가 보고되지만 모두 이번 변경 전부터 존재하던 사전 이슈. 본 플랜의 변경 파일·라인 범위와 무관하므로 수정 범위 밖(deferred).
- Untracked files (BUSINESS_PLAN.md, MARKETING_PLAN.md, favicon_final.png 등)은 이번 플랜 범위가 아님.

## Commits

- `6d504a5` — style(260419-tce): shrink badge/button row fonts to text-[9px]
- `97215cf` — style(260419-tce): reduce info box padding p-3 → p-2.5
- `dbac3e1` — style(260419-tce): reduce keyword box padding px-5 py-3 → px-4 py-2.5

## Self-Check

- [x] src/BloggerMasterApp.jsx edits present
- [x] Commits `6d504a5`, `97215cf`, `dbac3e1` exist in git log
- [x] `npm run build` succeeds
- [x] 변경 범위 외 영역 grep으로 불변 확인
