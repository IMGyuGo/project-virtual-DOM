# Virtual DOM Fridge Board (Vanilla JS)

React의 Virtual DOM / Diff / Patch 개념을 실습하기 위한 팀 프로젝트 골격입니다.

## 실행

```bash
python3 -m http.server 8002
```

브라우저에서 `http://localhost:8002` 접속.

## 현재 포함된 틀

- `DOM -> VDOM` 변환 함수
- 기본 Diff 알고리즘 (`CREATE/REMOVE/REPLACE/TEXT/PROPS`)
- Patch 적용 엔진
- 실제 영역/테스트 영역 + Patch/뒤로가기/앞으로가기 버튼
- State History(undo/redo)
- Virtual DOM / Patch JSON Viewer

## 팀 분업 권장

- `src/core`: VNode/변환/렌더링
- `src/diff`: 최소 변경 탐색 알고리즘 고도화(key 기반 포함)
- `src/patch`, `src/state`: 실제 DOM 반영 최적화 및 history 정책
- `src/ui`, `src/styles`, `docs`: UX 개선, 시각화, 발표 문서
