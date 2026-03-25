# Virtual DOM 프로젝트 흐름도

![Virtual DOM 프로젝트 흐름도](D:/jungleCamp/Projects/virtualDom/img/flow.png)

위 이미지는 현재 프로젝트의 실제 실행 흐름을 한 장으로 정리한 다이어그램이다.  
기준 파일은 `src/app.js`이고, `core -> diff -> patch -> state -> ui`가 어떻게 연결되는지를 색으로 나눠 보여준다.

## 흐름 읽는 법

- 파란색: 앱 시작 시 초기화 흐름
- 주황색: `Patch` 버튼을 눌렀을 때 실행되는 핵심 흐름
- 초록색: `Undo / Redo`로 이전 상태를 복원하는 흐름
- 오른쪽 요약 박스: 실행 중 계속 유지되는 핵심 객체

## 1. 초기 부팅 흐름

앱이 시작되면 `bootstrap()`이 전체 흐름을 조립한다.

1. `createLayout(root)`가 화면 레이아웃과 버튼, 상태 문구, JSON 뷰어를 만든다.
2. `createSampleBoardNode()`가 샘플 보드를 실제 DOM으로 만든다.
3. 이 샘플 DOM을 `actualRoot`에 넣는다.
4. `domToVdom()`가 실제 DOM을 읽어서 `initialTree`를 만든다.
5. `mountVdom()`가 같은 트리를 `testRoot`에 렌더링한다.
6. `createStore(initialTree)`와 `new History(initialTree)`가 현재 기준 트리와 이력을 초기화한다.

즉 시작 시점에는 `actualRoot`, `testRoot`, `store`, `history`가 같은 기준으로 맞춰진 상태가 된다.

## 2. Patch 흐름

이 프로젝트의 핵심은 사용자가 `testRoot`를 수정한 뒤 `Patch` 버튼을 눌렀을 때 일어나는 흐름이다.

1. 사용자가 `testRoot` 내용을 수정한다.
2. `onPatch()`가 실행된다.
3. `store.getTree()`로 이전 기준 트리 `prevTree`를 가져온다.
4. `domToVdom(latestTestNode)`로 수정된 테스트 DOM을 `nextTree`로 바꾼다.
5. `diff(prevTree, nextTree)`가 차이를 `patches[]`로 계산한다.
6. `applyPatches(currentActualNode, patches)`가 실제 화면 DOM에 필요한 부분만 반영한다.
7. `history.push(nextTree)`와 `store.setTree(nextTree)`로 새 기준을 저장한다.
8. JSON 뷰어, patch 로그, 상태 문구, 버튼 상태를 다시 갱신한다.

핵심 메시지는 이것이다.

**사용자 수정 -> VDOM 변환 -> Diff 계산 -> Patch 적용 -> History 저장**

## 3. Undo / Redo 흐름

`Undo`와 `Redo`는 patch를 다시 계산하지 않고 저장된 스냅샷을 복원한다.

1. `history.undo()` 또는 `history.redo()`를 호출한다.
2. `syncFromHistory(tree)`가 복원용 트리를 받는다.
3. `store.setTree(tree)`로 현재 기준을 바꾼다.
4. `renderBothFromTree()`로 `actualRoot`와 `testRoot`를 같은 상태로 다시 렌더링한다.
5. JSON 뷰어와 버튼 상태, 상태 문구를 갱신한다.

즉 `Patch`는 차이를 계산해서 반영하는 흐름이고, `Undo / Redo`는 저장된 상태를 그대로 복원하는 흐름이다.

## 4. 발표할 때 강조하면 좋은 포인트

- `actualRoot`는 최종 결과가 보이는 실제 화면이다.
- `testRoot`는 자유롭게 수정해보는 실험 공간이다.
- `store`는 현재 비교 기준이 되는 VDOM이다.
- `history`는 undo/redo를 위한 스냅샷 묶음이다.
- `domToVdom()`와 `getChildNodesForPath()`는 같은 child filtering 규칙을 써야 `path`가 어긋나지 않는다.

## 한 줄 요약

현재 프로젝트는 **실제 DOM을 VDOM으로 만들고, 테스트 영역 수정분을 다시 VDOM으로 변환한 뒤, diff 결과만 실제 화면에 patch하고 history로 관리하는 구조** 다.


