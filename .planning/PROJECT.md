# Blue Review — 구조 리팩토링

## What This Is

블로거를 위한 올인원 관리 앱(스케줄, 템플릿, Google Calendar 연동, 인증). 현재 React 19 + Vite + Supabase 기반으로 동작하며 Vercel(blue-review.com)에 배포 중. 이번 마일스톤은 기존 기능을 100% 유지하면서 내부 구조를 전면 개선하는 것이 목표.

## Core Value

사용자가 느끼는 동작은 전혀 바뀌지 않으면서, 코드를 유지보수·확장 가능한 구조로 만든다.

## Requirements

### Validated

- ✓ 이메일/비밀번호 인증 (회원가입, 로그인, 비밀번호 재설정) — existing
- ✓ OAuth 로그인 (Google, Kakao) — existing
- ✓ 생체인증 잠금 (WebAuthn) — existing
- ✓ 블로그 스케줄 관리 (CRUD, 드래그 정렬) — existing
- ✓ Google Calendar 연동 (토큰 교환, 이벤트 동기화) — existing
- ✓ 템플릿 관리 (협찬 요청, FTC 공시, 드래그 정렬) — existing
- ✓ 프로필/채널 설정 — existing
- ✓ 날씨·위치 정보 표시 — existing
- ✓ 이미지 내보내기 (html2canvas) — existing

### Active

- [ ] BloggerMasterApp.jsx(4,243줄)을 기능별 컴포넌트로 분리
- [ ] 50개+ useState를 기능별 커스텀 훅/상태관리로 정리
- [ ] localStorage 데이터를 Supabase DB로 마이그레이션
- [ ] 기존 모든 기능이 리팩토링 후에도 동일하게 동작

### Out of Scope

- UI/디자인 변경 — 별도로 Gemini를 활용해 진행 예정
- 새로운 기능 추가 — 구조 개선 완료 후 다음 마일스톤에서
- 테스트 코드 작성 — 현재 테스트 없음, 구조 개선 후 별도 진행

## Context

- 현재 전체 앱 로직이 `src/BloggerMasterApp.jsx` 하나에 집중 (4,243줄)
- 상태 50개+가 한 컴포넌트에 있어 무관한 상태 변경 시에도 전체 리렌더링
- 데이터가 localStorage에만 저장되어 기기 간 동기화 불가
- Supabase는 인증용으로만 사용 중, DB는 미활용
- Google Calendar 토큰이 URL hash와 localStorage에 평문 저장 (보안 우려)
- useCallback/useMemo 미사용으로 불필요한 리렌더링 발생
- 모든 텍스트가 한국어 하드코딩 (i18n 미적용)

## Constraints

- **Tech Stack**: React 19 + Vite + Tailwind CSS 유지 — 기존 스택 변경 없음
- **Backend**: Supabase (Auth + DB) + Vercel Serverless Functions 유지
- **배포**: Vercel (blue-review.com) 그대로 유지
- **기능 동등성**: 리팩토링 전후 사용자 경험이 동일해야 함

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| UI 변경 제외 | 구조 개선과 UI 개선 분리, UI는 Gemini로 별도 진행 | — Pending |
| localStorage→Supabase DB 이전 포함 | 기기 간 동기화 및 데이터 안정성 확보 | — Pending |
| 전면 리팩토링 한 마일스톤으로 | 부분 리팩토링보다 일관된 구조로 한번에 전환 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-06 after initialization*
