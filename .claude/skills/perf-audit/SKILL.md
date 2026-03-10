---
name: perf-audit
description: "Next.js 15 App Router 프로젝트의 성능 패턴을 정적 분석하여 Image 최적화, dynamic import, generateStaticParams, 폰트 최적화를 점검한다"
argument-hint: "[path] [--category image|import|render|font]"
user-invocable: true
allowed-tools: Read, Glob, Grep
---

$ARGUMENTS

# Perf Audit

Next.js 15 App Router 프로젝트의 성능 안티패턴을 정적 분석하여
카테고리별 점수(각 25점, 총 100점)와 등급(PASS/WARN/FAIL)으로 결과를 출력하는 도구입니다.

## Process

### 1. Arguments 파싱

`$ARGUMENTS`를 분석하여 다음 옵션을 추출한다:

- **path**: 검사할 경로 (생략 시 `src/` 전체 대상)
- **--category**: 특정 카테고리만 검사
  - `image` — Image 최적화 패턴
  - `import` — Dynamic import 패턴
  - `render` — 렌더링 전략 패턴
  - `font` — 폰트 최적화 패턴
  - 생략 시 전체 4개 카테고리 검사

### 2. 대상 파일 탐색

Glob으로 대상 경로에서 `.tsx`, `.ts`, `.jsx`, `.js` 파일을 찾는다.
`node_modules`, `.next`, `dist` 디렉토리는 제외.

### 3. 카테고리별 검사 항목

#### Image 최적화 (25점)

| ID  | 심각도  | 검사 내용 |
|-----|---------|----------|
| P01 | Error   | HTML `<img>` 태그 사용 (`next/image` 미사용) |
| P02 | Warning | `<Image>` 컴포넌트에 `priority` 속성 누락 (LCP 이미지 추정) |
| P03 | Warning | `<Image>` 컴포넌트에 `sizes` 속성 누락 |

#### Dynamic Import (25점)

| ID  | 심각도  | 검사 내용 |
|-----|---------|----------|
| P04 | Error   | 무거운 라이브러리 정적 import (chart.js, monaco-editor, three.js 등) |
| P05 | Warning | Client 전용 컴포넌트 `dynamic()` 호출에 `ssr: false` 누락 |
| P06 | Warning | 페이지 컴포넌트 크기 과다 (단일 파일 300줄 초과 추정) |

#### 렌더링 전략 (25점)

| ID  | 심각도  | 검사 내용 |
|-----|---------|----------|
| P07 | Error   | 동적 세그먼트 페이지에 `generateStaticParams` 누락 |
| P08 | Warning | 불필요한 `'use client'` — 서버 컴포넌트로 충분한 파일에 사용 |
| P09 | Info    | `cache()` 또는 `unstable_cache` 미사용 (데이터 패칭 함수) |

#### 폰트 최적화 (25점)

| ID  | 심각도  | 검사 내용 |
|-----|---------|----------|
| P11 | Error   | Google Fonts `<link>` 직접 로드 (`next/font` 미사용) |
| P12 | Warning | `next/font` 사용 시 `display` 옵션 누락 |
| P13 | Info    | 여러 폰트 패밀리를 별도 변수로 선언하지 않음 |

### 4. 점수 계산

각 카테고리 25점 기준:
- Error 1건당: -10점
- Warning 1건당: -4점
- Info 1건당: -2점
- 최소 0점 (음수 불가)

총점 = 4개 카테고리 합계 (최대 100점)

**등급 판정**:
- **PASS**: 총점 ≥ 85, Error = 0
- **WARN**: 총점 ≥ 60, Error ≤ 2
- **FAIL**: 총점 < 60 OR Error ≥ 3

### 5. 결과 출력

아래 Output 형식에 따라 출력한다.

## Output

```
Perf Audit 결과
===============
검사 경로: {path}
파일 수: {N}개
총점: {score}/100 — {PASS|WARN|FAIL}

카테고리별 점수
---------------
Image    : {n}/25 {PASS|WARN|FAIL}
Import   : {n}/25 {PASS|WARN|FAIL}
Render   : {n}/25 {PASS|WARN|FAIL}
Font     : {n}/25 {PASS|WARN|FAIL}

발견사항
--------

#### Image ({n}건)
| ID  | 심각도  | 파일 | 위치 | 내용 | 권장 조치 |
|-----|---------|------|------|------|----------|
| P01 | Error   | page.tsx | L18 | <img> 태그 사용 | next/image의 <Image>로 교체 |

#### Dynamic Import ({n}건)
...

#### 렌더링 전략 ({n}건)
...

#### 폰트 ({n}건)
...

즉시 조치 필요 (Error)
----------------------
1. {파일}:{줄} — {ID}: {내용}
   권장: {권장 조치}
```

## Error Cases

- **경로가 존재하지 않는 경우**: `오류: '{path}' 경로를 찾을 수 없습니다.` 출력 후 종료
- **TSX/TS 파일이 없는 경우**: `'{path}'에서 검사할 파일을 찾지 못했습니다.` 출력
- **이슈가 0건인 경우**: 전 카테고리 PASS, 총점 100/100 출력
