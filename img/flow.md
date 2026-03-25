# Virtual DOM 프로젝트 흐름도

![Virtual DOM 프로젝트 흐름도](./flow.png)

이 문서는 **화면 UI 배치 설명**이 아니라, 현재 프로젝트가 실제로 **어떤 코드 순서로 동작하는지**를 정리한 설명서다.  
기준은 [src/app.js](D:/jungleCamp/Projects/virtualDom/src/app.js)의 `bootstrap()`, `onPatch()`, `onUndo()`, `onRedo()` 흐름이며, 여기에 연결된 `core`, `diff`, `patch`, `state`, `ui` 모듈의 역할을 함께 묶어서 본다.

추가로 아래의 보조 이미지도 함께 보면 이해가 더 쉽다.

![Virtual DOM 요약 흐름도](./virtual_dom_flow_3.png)

## 문서 보는 기준

- 파란색: 앱 시작 시 초기화 흐름
- 주황색: `Patch` 버튼을 눌렀을 때의 내부 실행 흐름
- 초록색: `Undo / Redo`로 이전 상태를 복원하는 흐름
- 오른쪽 요약 박스: 실행 중 계속 유지되는 핵심 객체

## 보조 이미지 설명

`virtual_dom_flow_3.png`는 위의 메인 흐름도를 더 압축해서 보여주는 요약판이다.

- [flow.png](D:/jungleCamp/Projects/virtualDom/img/flow.png)는 단계별 설명을 읽으면서 따라가기 좋은 버전이다.
- [virtual_dom_flow_3.png](D:/jungleCamp/Projects/virtualDom/img/virtual_dom_flow_3.png)는 발표나 빠른 공유용으로 보기 좋은 버전이다.

이 보조 이미지는 특히 아래 포인트를 한 번에 보여준다.

1. 초기화, Patch, Undo/Redo가 서로 다른 세 개의 흐름으로 분리되어 있다는 점
2. `actualRoot`, `testRoot`, `store`, `history`가 실행 내내 유지되는 핵심 객체라는 점
3. Patch 흐름의 중심이 `testRoot 수정 -> domToVdom() -> diff() -> applyPatches() -> history/store 저장`이라는 점
4. Undo/Redo는 `history`에서 상태를 가져와 `renderBothFromTree()`로 복원하는 구조라는 점

즉 메인 이미지가 “설명 중심 다이어그램”이라면, 보조 이미지는 “한 장 요약 다이어그램”이라고 보면 된다.

## 1. 전체 흐름 요약

현재 프로젝트는 아래 순서로 움직인다.

1. 실제 DOM 샘플을 만든다.
2. 그 DOM을 초기 VDOM(`initialTree`)으로 변환한다.
3. 같은 트리를 `testRoot`에 렌더링해서 수정 가능한 실험 공간을 만든다.
4. 사용자가 `testRoot`를 수정한 뒤 `Patch` 버튼을 누른다.
5. 수정된 DOM을 다시 VDOM으로 변환한다.
6. 이전 트리와 새 트리를 `diff()`로 비교한다.
7. 차이만 `applyPatches()`로 `actualRoot`에 반영한다.
8. 새 상태를 `store`와 `history`에 저장한다.
9. 필요하면 `Undo / Redo`로 저장된 트리를 복원한다.

핵심 한 줄은 이것이다.

**사용자 수정 -> DOM -> VDOM 변환 -> diff 계산 -> patch 적용 -> history 저장**

## 2. 초기 부팅 흐름

초기화 흐름은 `bootstrap()`을 기준으로 본다.

1. `createLayout(root)`가 버튼, 상태 문구, 실제 영역, 테스트 영역, JSON 뷰어를 만든다.
2. `createSampleBoardNode()`가 샘플 보드를 실제 DOM으로 만든다.
3. 이 샘플 DOM을 `actualRoot`에 먼저 넣는다.
4. `domToVdom(ui.actualRoot.firstElementChild)`로 초기 VDOM인 `initialTree`를 만든다.
5. `mountVdom(ui.testRoot, initialTree)`로 같은 트리를 `testRoot`에도 렌더링한다.
6. `createStore(initialTree)`와 `new History(initialTree)`로 현재 기준 트리와 이력을 초기화한다.
7. JSON 뷰어와 버튼 상태를 동기화한 뒤, `bindControls()`로 버튼 이벤트를 연결한다.

즉 앱이 켜진 직후에는 아래 네 가지가 같은 기준을 바라보는 상태가 된다.

- `actualRoot`: 최종 결과가 보이는 실제 DOM
- `testRoot`: 사용자가 수정해보는 실험용 DOM
- `store`: 현재 비교 기준이 되는 VDOM
- `history`: undo/redo를 위한 스냅샷 기록

## 3. Patch 적용 흐름

이 섹션은 **UI 화면 설명이 아니라**, 사용자가 `Patch` 버튼을 눌렀을 때 **코드 내부에서 실제로 어떤 순서가 실행되는지**를 설명한 부분이다. 기준은 [src/app.js](D:/jungleCamp/Projects/virtualDom/src/app.js)의 `onPatch()`이다.

순서는 아래와 같다.

1. 사용자가 `testRoot` 내용을 직접 수정한다.
2. `Patch` 버튼을 누르면 `onPatch()`가 실행된다.
3. `store.getTree()`로 이전 기준 트리 `prevTree`를 가져온다.
4. `testRoot.firstElementChild`를 읽는다.
5. `domToVdom(latestTestNode)`로 수정된 테스트 DOM을 `nextTree`로 변환한다.
6. `diff(prevTree, nextTree)`가 두 트리의 차이를 `patches[]`로 계산한다.
7. `applyPatches(currentActualNode, patches)`가 실제 화면 DOM에 필요한 변경만 반영한다.
8. 반영이 끝나면 `history.push(nextTree)`와 `store.setTree(nextTree)`로 새 기준을 저장한다.
9. 마지막으로 JSON 뷰어, 상태 문구, 버튼 상태를 다시 갱신한다.

즉 `Patch`는 단순히 버튼 하나의 UI 동작이 아니라, 아래 내부 처리 파이프라인을 뜻한다.

**testRoot 수정분 읽기 -> nextTree 생성 -> diff 계산 -> actualRoot에 patch 적용 -> 새 상태 저장**

## 4. Undo / Redo 복원 흐름

`Undo / Redo`는 patch를 다시 계산하지 않고, 저장해둔 트리를 그대로 복원하는 흐름이다.

1. `history.undo()` 또는 `history.redo()`를 호출한다.
2. 복원할 트리를 받으면 `syncFromHistory(tree)`가 실행된다.
3. `store.setTree(tree)`로 현재 기준 트리를 교체한다.
4. `renderBothFromTree()`로 `actualRoot`와 `testRoot`를 같은 상태로 다시 렌더링한다.
5. JSON 뷰어, 버튼 상태, 상태 문구를 다시 갱신한다.

정리하면:

- `Patch`: 차이를 계산해서 반영하는 흐름
- `Undo / Redo`: 저장된 스냅샷을 복원하는 흐름

## 5. 핵심 객체 설명

- `actualRoot`: 최종 결과가 보이는 실제 화면 DOM
- `testRoot`: 사용자가 자유롭게 수정해보는 실험 공간 DOM
- `store`: 현재 비교 기준이 되는 VDOM 트리
- `history`: undo/redo를 위한 트리 스냅샷 목록
- `patchViewer`: `diff()` 결과인 `patches[]`를 보여주는 영역

## 6. 이 문서에서 특히 중요한 포인트

- 이 문서는 “UI가 어떻게 생겼는가”보다 “내부 코드가 어떤 순서로 실행되는가”를 설명한다.
- `Patch 적용 흐름`은 버튼 디자인 설명이 아니라 `onPatch()` 실행 순서 설명이다.
- `Undo / Redo`는 `diff()`를 다시 돌리는 게 아니라 `history`에 저장된 트리를 복원하는 구조다.
- Core 관점에서 가장 중요한 연결점은 `domToVdom()`와 patch path 규칙이 같은 child filtering 기준을 가져야 한다는 점이다.

## 7. 발표용 요약 문장

이 프로젝트는 **실제 DOM을 VDOM으로 변환해 기준 트리를 만들고, 테스트 영역에서 수정된 DOM을 다시 VDOM으로 바꿔 이전 트리와 비교한 뒤, 필요한 patch만 실제 화면에 적용하고 history로 상태를 관리하는 구조**다.
