# Role Breakdown

이 문서는 현재 Virtual DOM 팀 프로젝트에서 역할을 `Core`, `Diff`, `Patch/State`, `UI`로 나눠서 진행했던 흐름을 정리한 문서이다.  
이번 프로젝트는 단순히 기능을 나눠서 구현한 것이 아니라, **Virtual DOM 파이프라인 순서대로 책임을 분리**해서 병렬 작업과 통합이 가능하도록 설계했다.

전체 흐름은 아래와 같다.

1. `Core`가 Virtual DOM의 기준 구조를 만든다.
2. `Diff`가 이전 트리와 다음 트리를 비교해서 변경 목록을 만든다.
3. `Patch/State`가 변경 목록을 실제 DOM에 반영하고 history를 관리한다.
4. `UI`가 이 전체 흐름을 사용자가 조작하고 확인할 수 있는 데모 화면으로 연결한다.

## 1. Team Role Assignment

### Core

- 소유 범위: `src/core/*`
- 핵심 책임: DOM과 VDOM 사이의 기준 규약 정의
- 대표 파일:
  - `src/core/vnode.js`
  - `src/core/domToVdom.js`
  - `src/core/renderVdom.js`

### Diff

- 소유 범위: `src/diff/*`
- 핵심 책임: 이전 상태와 다음 상태를 비교해 patch 배열 생성
- 대표 파일:
  - `src/diff/diff.js`
  - `src/diff/diffProps.js`
  - `src/diff/diffChildren.js`
  - `src/diff/keyedDiff.js`
  - `src/diff/patchTypes.js`

### Patch / State

- 소유 범위: `src/patch/*`, `src/state/*`
- 핵심 책임: patch 적용, DOM 반영, undo/redo 관리
- 대표 파일:
  - `src/patch/applyPatch.js`
  - `src/patch/domOps.js`
  - `src/state/history.js`
  - `src/state/store.js`

### UI

- 소유 범위: `src/ui/*`, `src/styles/*`, 일부 `docs/*`
- 핵심 책임: 데모 화면 구성, 컨트롤 연결, 시각화와 검증
- 대표 파일:
  - `src/ui/layout.js`
  - `src/ui/controls.js`
  - `src/ui/nexusDemo.js`
  - `src/ui/jsonTreeViewer.js`
  - `src/styles/main.css`

## 2. 분할했던 작업 흐름

이번 분업은 기능별 분리보다 **데이터 흐름 기준 분리**에 가깝다.

### Step 1. Core가 공통 계약을 먼저 고정

Core 파트는 모든 팀원이 공통으로 사용할 `VNode` 구조와 변환 규칙을 먼저 정리했다.

- `createElementVNode()`, `createTextVNode()`로 VNode 기본 형태 정의
- `domToVdom()`로 실제 DOM을 비교 가능한 트리 구조로 변환
- `renderVdom()`과 `mountVdom()`로 VDOM을 실제 DOM으로 복원
- `props.key ?? props['data-key'] ?? null` 규칙으로 key 해석 기준 통일
- 공백 text node, comment node를 제외하는 child filtering 규칙 확정

이 단계가 먼저 끝나야 하는 이유는 `Diff`와 `Patch`가 모두 Core가 만든 `children` 순서와 `path` 기준을 그대로 사용하기 때문이다.

### Step 2. Diff가 변경 목록 생성 규칙 구현

Diff 파트는 Core가 고정한 VDOM 구조를 기준으로 두 트리를 비교하는 로직을 구현했다.

- `diff(oldTree, newTree)` 메인 진입점 구현
- `CREATE`, `REMOVE`, `REPLACE`, `TEXT`, `PROPS`, `MOVE` 처리
- `diffProps.js`에서 속성 변경만 분리 계산
- `diffChildren.js`에서 index 비교와 key 비교 분기
- `keyedDiff.js`에서 `data-key` 기반 reorder 탐지
- patch를 항상 같은 형식과 순서로 반환하도록 규칙 고정

즉, Diff의 역할은 "무엇이 바뀌었는지 설명하는 것"까지이며, 실제 DOM 수정은 하지 않는다.

### Step 3. Patch / State가 실제 반영과 이력 관리 담당

Patch/State 파트는 Diff가 만든 patch 배열을 실제 DOM에 적용하고, 변경 이력을 관리한다.

- `applyPatches()`에서 patch 정렬 후 실제 DOM 반영
- `domOps.js`에서 `path` 기준으로 대상 노드 탐색
- 깊은 노드부터 적용해서 index shift 문제 최소화
- `PROPS`를 UI 친화적인 `UPDATE_PROPS`로 다룰 수 있게 정리
- `History` 클래스에서 `push`, `undo`, `redo`, `canUndo`, `canRedo` 구현
- `store`로 현재 기준 트리 상태 유지

이 파트는 단순 렌더링보다도 "현재 상태를 안정적으로 되돌릴 수 있는가"가 중요했기 때문에 undo/redo 일관성이 핵심 역할이었다.

### Step 4. UI가 전체 파이프라인을 사용자 경험으로 연결

UI 파트는 앞 단계에서 만든 Core, Diff, Patch/State를 실제 데모 화면으로 묶었다.

- `layout.js`에서 전체 화면 구조 생성
- `nexusDemo.js`에서 스마트홈 데모 상태와 편집 이벤트 구성
- `controls.js`에서 Patch / Undo / Redo / Away Mode / Reset 연결
- `jsonTreeViewer.js`에서 VDOM과 diff 결과 시각화
- `main.css`에서 데모 레이아웃과 패널 스타일링

UI는 직접 Virtual DOM 엔진을 만들기보다는, 엔진 결과가 잘 보이도록 연결하고 검증 가능한 형태로 드러내는 역할을 맡았다.

## 3. 역할별 상세 책임

### Core 파트

- Virtual DOM의 최소 단위를 정의했다.
- 실제 DOM을 VDOM으로 바꾸는 기준을 만들었다.
- VDOM을 다시 실제 DOM으로 복원하는 렌더러를 만들었다.
- 이후 파트가 의존하는 `key`, `children`, `text node` 처리 규칙을 문서화했다.

Core의 handoff:

- Diff에게는 "비교 가능한 안정적인 VDOM 트리"를 넘긴다.
- Patch에게는 "path가 어긋나지 않는 children 순서 규칙"을 넘긴다.
- UI에게는 "화면을 다시 그릴 수 있는 mount/render 함수"를 넘긴다.

### Diff 파트

- 이전 트리와 다음 트리 차이를 patch 배열로 계산했다.
- 속성 변경과 구조 변경을 구분했다.
- key가 있는 리스트에서는 reorder와 move를 감지했다.
- patch가 항상 재현 가능하도록 deterministic한 순서를 유지했다.

Diff의 handoff:

- Patch/State에게는 "실행 가능한 patch 목록"을 넘긴다.
- UI에게는 "사용자에게 보여줄 diff 결과와 patch log 데이터"를 넘긴다.

### Patch / State 파트

- patch 배열을 실제 DOM에 적용했다.
- 깊은 path 우선 적용과 우선순위 정렬로 오작동을 막았다.
- 상태 snapshot을 저장하고 되돌릴 수 있게 했다.
- undo/redo 시 actual/test 영역이 함께 복원되도록 준비했다.

Patch/State의 handoff:

- UI에게는 "실제 반영된 DOM 상태"와 "이동 가능한 이력 상태"를 넘긴다.

### UI 파트

- 실제 적용 영역과 수정 영역을 분리해서 보여줬다.
- 사용자가 수정한 결과를 Patch 버튼으로 반영할 수 있게 했다.
- 실시간 patch log, diff JSON, 현재/다음 VDOM, tree visualizer를 연결했다.
- 발표 시나리오가 바로 보이도록 스마트홈 보드 데모를 구성했다.

UI의 handoff:

- 최종 사용자와 발표자에게 "엔진이 어떻게 동작하는지 눈으로 확인 가능한 결과물"을 제공한다.

## 4. 실제 연결 흐름

현재 프로젝트의 실제 실행 흐름은 `src/app.js`를 중심으로 아래 순서로 이어진다.

1. `createLayout()`으로 UI 뼈대를 만든다.
2. `createSampleBoardNode()` 또는 `createNexusBoard()`로 초기 DOM을 만든다.
3. `domToVdom()`으로 초기 트리를 만든다.
4. 사용자가 `testRoot`에서 상태를 수정한다.
5. `diff(store.getTree(), nextTree)`로 patch를 계산한다.
6. `applyPatches()`로 `actualRoot` DOM에 반영한다.
7. `history.push(nextTree)`로 상태 이력을 저장한다.
8. `renderJson()`과 patch log UI로 결과를 시각화한다.

정리하면 아래와 같은 흐름이다.

`Core -> Diff -> Patch/State -> UI`

그리고 사용자가 다시 화면을 수정하면 이 흐름이 반복된다.

## 5. 협업 방식

이번 분업 방식의 장점은 각 역할의 경계가 비교적 명확했다는 점이다.

- Core는 데이터 구조 계약에 집중
- Diff는 비교 알고리즘에 집중
- Patch/State는 실제 반영 안정성과 이력 관리에 집중
- UI는 데모 조작과 시각화에 집중

이렇게 나누면 각 파트가 동시에 개발되더라도 충돌이 적고, 마지막에는 `app.js`에서 순서대로 조립하면 되기 때문에 통합 흐름도 단순해진다.

## 6. 최종 요약

이 프로젝트의 역할 분담은 단순한 화면/로직 분리가 아니라, Virtual DOM 엔진의 실행 파이프라인 자체를 팀 역할로 나눈 구조였다.

- Core: VDOM 규약과 변환
- Diff: 변경점 계산
- Patch/State: 실제 반영과 history
- UI: 조작, 시각화, 데모 완성

따라서 이번 팀 프로젝트의 핵심 분할 흐름은 다음 한 줄로 정리할 수 있다.

**"Core가 기준을 만들고, Diff가 차이를 계산하고, Patch/State가 반영하고, UI가 그 과정을 사용자가 이해할 수 있는 데모로 보여준다."**
