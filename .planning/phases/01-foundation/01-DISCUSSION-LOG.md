# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 01-foundation
**Areas discussed:** Feature 폴더 구조, 커스텀 훅 경계, 에러 바운더리 UX, Zod 검증 전략

---

## Feature 폴더 구조

| Option | Description | Selected |
|--------|-------------|----------|
| 기능별 완전 분리 | features/{domain}/에 components/, hooks/, services/, constants/ 하위 폴더 | ✓ |
| 기능별 플랫 | 하위 폴더 없이 파일로만 | |
| 하이브리드 | components/만 하위 폴더, 나머지는 플랫 | |

**User's choice:** 기능별 완전 분리 (추천)

| Option | Description | Selected |
|--------|-------------|----------|
| src/components/ui/ | 기존 components에 ui/ 추가 | ✓ |
| src/shared/ | 별도 shared/ 디렉토리 | |
| Claude가 결정 | | |

**User's choice:** src/components/ui/

---

## 커스텀 훅 경계

| Option | Description | Selected |
|--------|-------------|----------|
| 5개 핵심 도메인 | useSchedules, useTemplates, useProfile, useGoogleCalendar, useWeather | ✓ |
| 세분화 7~8개 | + useFtcTemplates, useBiometric, useAdmin | |
| 최소화 3개 | useUserData, useCalendar, useWeather | |

**User's choice:** 5개 핵심 도메인 (추천)

| Option | Description | Selected |
|--------|-------------|----------|
| 현재는 localStorage 그대로 | Phase 1은 훅 내부에 localStorage 로직 유지, service 추상화는 Phase 2 | ✓ |
| 첫날부터 service 추상화 | 훅→service→localStorage 레이어 분리 | |
| Claude가 결정 | | |

**User's choice:** 현재는 localStorage 그대로 (추천)

---

## 에러 바운더리 UX

| Option | Description | Selected |
|--------|-------------|----------|
| 인라인 가볍게 | 해당 영역만 대체, 나머지 정상 | ✓ |
| 전체 화면 커버 | 앱 전체를 에러 화면으로 | |
| Claude가 결정 | | |

**User's choice:** 인라인 가볍게 (추천)

| Option | Description | Selected |
|--------|-------------|----------|
| App 루트 + Calendar + Templates | INFRA-01 그대로 | ✓ |
| 모든 Screen | Phase 3 이후 세분화 | |
| 루트만 | 최소 적용 | |

**User's choice:** App 루트 + Calendar + Templates (추천)

---

## Zod 검증 전략

| Option | Description | Selected |
|--------|-------------|----------|
| 안전한 기본값 + 콘솔 경고 | 빈 배열/기본 객체 반환, console.warn 기록 | ✓ |
| 손상 데이터 백업 + 기본값 | _corrupted 접미사로 보관 | |
| 사용자에게 에러 표시 | fallback 화면으로 이동 | |

**User's choice:** 안전한 기본값 + 콘솔 경고 (추천)

| Option | Description | Selected |
|--------|-------------|----------|
| feature별 schemas/ | features/{domain}/schemas.js | ✓ |
| src/schemas/ 중앙화 | 단일 디렉토리 | |

**User's choice:** feature별 schemas/

---

## Claude's Discretion

- ErrorBoundary 컴포넌트 세부 마크업
- Zod 스키마 필드 타입 세부 정의
- 상수 파일 내부 그룹핑
- 도메인 훅 반환 객체 API 형태

## Deferred Ideas

- Service 레이어 추상화 → Phase 2
- Screen 분리, BloggerMasterApp 해체 → Phase 3
- 모든 Screen에 에러 바운더리 → Phase 3
- 원격 에러 로깅 → 마일스톤 out of scope
