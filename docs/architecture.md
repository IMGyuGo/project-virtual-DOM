# Architecture

- Input: 테스트 영역 DOM
- Parse: `domToVdom`
- Compare: `diff(oldTree, newTree)`
- Commit: `applyPatches`
- Persist: `History.push`

## TODO

- key 기반 reorder 최소 연산 최적화
- 이벤트 핸들러/스타일 객체 단위 diff
- MutationObserver 기반 실제 DOM 변경 추적 로그
