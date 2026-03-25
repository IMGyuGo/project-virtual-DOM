# diff

`src/diff`는 이전 Virtual DOM 트리와 다음 Virtual DOM 트리를 비교해, 이후 patch 단계에서 사용할 변경 목록을 만드는 모듈입니다.

## 파일 구성

- `diff.js`
  - diff 계산의 메인 진입점입니다.
  - `diff(oldTree, newTree)`를 export 합니다.
  - 노드 타입 비교, props 비교, 자식 비교, `MOVE` patch 생성까지 담당합니다.

- `diffProps.js`
  - 같은 element 노드의 props 변경만 따로 계산합니다.
  - 반환 형식은 `{ set, remove }`입니다.

- `diffChildren.js`
  - 자식 노드를 어떤 기준으로 pair로 묶을지 결정합니다.
  - key가 없으면 index 기준 비교를 사용합니다.
  - key가 있으면 `keyedDiff.js`의 key 기반 pair 생성 로직을 사용합니다.

- `keyedDiff.js`
  - key가 있는 자식 노드를 같은 key끼리 먼저 매칭합니다.
  - `CREATE`, `REMOVE`, `MOVE` 판단에 필요한 pair 정보를 만듭니다.

- `patchTypes.js`
  - diff 단계에서 사용하는 patch type 상수를 정의합니다.
  - 현재 `CREATE`, `REMOVE`, `REPLACE`, `TEXT`, `PROPS`, `MOVE`를 사용합니다.

## 현재 diff 규칙

`diff.js`는 아래 순서로 비교합니다.

1. `oldNode`가 없고 `newNode`가 있으면 `CREATE`
2. `oldNode`가 있고 `newNode`가 없으면 `REMOVE`
3. 노드 타입이 다르거나 element tag가 다르면 `REPLACE`
4. 두 노드가 모두 text node이고 내용이 다르면 `TEXT`
5. 두 노드가 같은 element 타입이면 props를 비교하고 필요 시 `PROPS`
6. 자식 노드를 pair로 묶은 뒤, 같은 key의 위치가 바뀐 경우 `MOVE`
7. 각 자식 pair를 재귀적으로 다시 비교

## 자식 비교 방식

### key가 없는 경우

- `diffChildren.js`가 index 기준으로 자식을 pair로 묶습니다.
- 이 경우 `oldIndex`와 `newIndex`는 같은 index를 기준으로 채워집니다.
- 즉, 기존 방식과 같은 흐름을 유지합니다.

### key가 있는 경우

- `keyedDiff.js`가 같은 key를 가진 old/new 자식을 먼저 매칭합니다.
- 새 트리에만 있는 key는 `CREATE` 대상입니다.
- 이전 트리에만 남은 key는 `REMOVE` 대상입니다.
- old/new 양쪽에 같은 key가 있고 위치만 달라지면 `MOVE` 후보가 됩니다.

## patch 형식

반환값은 patch 객체 배열입니다.

```js
[
  { type: 'CREATE', path: [0, 1], node: newNode },
  { type: 'REMOVE', path: [2] },
  { type: 'REPLACE', path: [1], node: newNode },
  { type: 'TEXT', path: [0], text: 'changed' },
  {
    type: 'PROPS',
    path: [],
    props: {
      set: { className: 'active' },
      remove: ['disabled'],
    },
  },
  {
    type: 'MOVE',
    path: [1],
    to: 0,
    key: 'device-2',
  },
];
```

## pair 형식

자식 비교 함수는 현재 아래 형태의 pair 객체를 반환합니다.

```js
{
  oldChild,
  newChild,
  pathIndex,
  oldIndex,
  newIndex,
  key,
}
```

각 필드의 의미는 아래와 같습니다.

- `oldChild`: 이전 트리의 자식 노드
- `newChild`: 다음 트리의 자식 노드
- `pathIndex`: 재귀 비교 시 현재 path 계산에 사용할 index
- `oldIndex`: 이전 자식 배열에서의 위치
- `newIndex`: 다음 자식 배열에서의 위치
- `key`: key 기반 비교에서 사용한 key 값

## `path`

- `path`는 루트부터 따라가는 index 기반 경로입니다.
- 예를 들어 `[0, 2]`는 루트의 첫 번째 자식 아래 세 번째 자식을 뜻합니다.
- `MOVE`의 경우 `path`는 기존 위치를 가리키고, `to`는 이동할 새 위치를 뜻합니다.

## 예상하는 노드 형태

현재 구현은 대략 아래 형태의 노드를 전제로 합니다.

```js
// text node
{ type: 'text', text: 'hello' }

// element node
{
  type: 'element',
  tag: 'div',
  props: { id: 'app' },
  children: [],
  key: 'optional-key',
}
```

## 현재 상태와 한계

- key가 없는 경우는 index 기반 비교를 유지합니다.
- key가 있는 경우는 같은 key를 우선 매칭하는 keyed diff 구조를 사용합니다.
- `diff` 단계에서 생성한 `MOVE` patch는 patch 단계에서 key 기반으로 실제 DOM 재배치까지 반영됩니다.
- 이 프로젝트에서는 `props.key` 또는 `data-key`를 key로 인식합니다.
- 예: room-card는 `data-room="living"`과 함께 `data-key="living"`를 사용하면 재생성 없이 이동됩니다.
- 중복 key가 들어오는 경우는 현재 별도 예외 처리보다 첫 매칭 기준으로 동작합니다.

## 요약

- `diff.js`는 전체 diff 계산과 patch 생성의 중심입니다.
- `diffProps.js`는 props 변경만 계산합니다.
- `diffChildren.js`는 자식 비교 전략을 결정합니다.
- `keyedDiff.js`는 key 기반 pair 생성과 이동 판단용 정보를 제공합니다.
- `patchTypes.js`는 patch type 계약을 한 곳에서 관리합니다.
