docs/01-plan/features/ 의 plan.md 파일을 우선순위대로 한 번에 하나씩 처리한다.

처리 순서: TASK-12(즉시) → TASK-07(단기) → TASK-08(단기) → TASK-09(중기) → TASK-10(중기, TASK-09 완료 후) → TASK-11(중기)

각 이터레이션 동작:
1. docs/01-plan/features/ 에서 아직 design.md가 없는 가장 높은 우선순위 plan을 선택
2. plan.md의 Scope와 Success Criteria를 읽는다
3. /pdca design 실행 - design.md 생성
4. /pdca do 실행 - 실제 파일 수정
5. /pdca analyze 실행 - analysis.md 생성
6. /pdca report 실행 - report.md 생성
7. /pdca archive 실행

완료 조건: docs/01-plan/features/ 에 .plan.md 파일이 하나도 남지 않으면 <promise>ALL PDCA TASKS COMPLETE</promise> 를 출력한다
