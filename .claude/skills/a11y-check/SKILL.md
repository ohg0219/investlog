---
name: a11y-check
description: "컴포넌트 및 페이지 파일의 접근성 패턴을 정적 분석하여 WCAG 2.1 AA 기준 위반을 점검한다"
argument-hint: "[path] [--strict]"
user-invocable: true
allowed-tools: Read, Glob, Grep
---

$ARGUMENTS

# A11y Check

컴포넌트와 페이지 파일을 정적 분석하여 WCAG 2.1 AA 접근성 기준 위반을 점검하고,
점수(0~100)와 등급(PASS/WARN/FAIL)으로 결과를 출력하는 도구입니다.

## Process

### 1. Arguments 파싱

`$ARGUMENTS`를 분석하여 다음 옵션을 추출한다:

- **path**: 검사할 경로 (생략 시 `src/` 전체 대상)
  - 예: `src/components/`, `src/app/about/page.tsx`
- **--strict**: 엄격 모드 — Warning도 FAIL 판정에 포함

### 2. 대상 파일 탐색

Glob으로 대상 경로에서 `.tsx`, `.jsx` 파일을 찾는다.
`node_modules`, `.next`, `dist` 디렉토리는 제외.

### 3. 접근성 패턴 검사 (10개 항목)

각 파일에 대해 아래 체크리스트를 Grep으로 검사한다:

| ID  | 심각도  | 검사 내용 |
|-----|---------|----------|
| A01 | Error   | `<img>` / `<Image>` alt 속성 누락 |
| A02 | Error   | 인터랙티브 요소(button, a, input) aria-label 또는 텍스트 누락 |
| A03 | Error   | icon-only 버튼 — SVG만 있고 레이블 없음 |
| A04 | Warning | `outline-none` 적용 후 대체 focus 스타일 없음 |
| A05 | Warning | animation/transition 있으나 `prefers-reduced-motion` 처리 없음 |
| A06 | Warning | 저대비 Tailwind 색상 패턴 |
| A07 | Warning | `role` 속성 비표준 값 사용 |
| A08 | Info    | `tabIndex` 양수 값 |
| A09 | Info    | `aria-hidden` 남용 — 포커스 가능한 요소에 적용 |
| A10 | Info    | heading 계층 순서 위반 (h1 → h3 건너뜀 등) |

### 4. 점수 계산

100점 기준으로 감점:
- Error 1건당: -10점
- Warning 1건당: -3점
- Info 1건당: -1점

**등급 판정**:
- **PASS**: score ≥ 80, Error = 0
- **WARN**: score ≥ 60, Error ≤ 2
- **FAIL**: score < 60 OR Error ≥ 3

`--strict` 모드: PASS 기준이 score ≥ 90, Error = 0, Warning = 0으로 강화.

### 5. 결과 출력

아래 Output 형식에 따라 출력한다.

## Output

```
A11y Check 결과
===============
검사 경로: {path}
파일 수: {N}개
점수: {score}/100 — {PASS|WARN|FAIL}
이슈: Error {n}건 | Warning {n}건 | Info {n}건

파일별 결과
-----------

### {파일경로} — {PASS|WARN|FAIL}
| ID  | 심각도  | 위치 | 내용 | 권장 조치 |
|-----|---------|------|------|----------|
| A01 | Error   | L24  | <img> alt 누락 | 설명적 alt 텍스트 추가 또는 장식용이면 alt="" |
| A04 | Warning | L31  | outline-none 단독 사용 | focus-visible:ring-2 추가 |

주요 발견사항
-------------
Error {n}건:
  - {파일}:{줄}: {내용}

Warning {n}건:
  - {파일}:{줄}: {내용}

Info {n}건:
  - {파일}:{줄}: {내용}

권장 우선순위
-------------
1. [즉시] {가장 심각한 Error 항목}
2. [단기] {Warning 항목}
3. [검토] {Info 항목}
```

## Error Cases

- **경로가 존재하지 않는 경우**: `오류: '{path}' 경로를 찾을 수 없습니다.` 출력 후 종료
- **TSX/JSX 파일이 없는 경우**: `'{path}'에서 검사할 파일을 찾지 못했습니다.` 출력
- **이슈가 0건인 경우**: 각 섹션을 `없음`으로 표기하고 PASS 출력
