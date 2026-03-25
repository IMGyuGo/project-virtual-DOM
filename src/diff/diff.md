# diff

`src/diff`는 이전 Virtual DOM 트리와 다음 Virtual DOM 트리를 비교해, 이후 patch 단계에서 사용할 변경 목록을 만드는 모듈입니다.

---

## 파일 구성

### `diff.js`
- diff 계산의 메인 진입점입니다.
- `diff(oldTree, newTree)`를 export 합니다.
- 노드 타입 비교, props 비교, 자식 비교, `MOVE` patch 생성, 같은 부모 기준 patch 정렬까지 담당합니다.

### `diffProps.js`
- 같은 `element` 노드의 props 변경만 따로 계산합니다.
- 반환 형식은 `{ set, remove }`입니다.

### `diffChildren.js`
- 자식 노드를 어떤 기준으로 pair로 묶을지 결정합니다.
- key가 없으면 index 기준 비교를 사용합니다.
- key가 있으면 `keyedDiff.js`의 key 기반 pair 생성 로직을 사용합니다.
- index 기반 비교와 key 기반 비교가 모두 같은 pair 계약을 반환하도록 구조를 맞춥니다.

### `keyedDiff.js`
- key가 있는 자식 노드를 같은 key끼리 먼저 매칭합니다.
- `CREATE`, `REMOVE`, `MOVE` 판단에 필요한 pair 정보를 만듭니다.
- 중복 key가 들어오면 경고를 남기고, 첫 번째 key를 기준으로 매칭합니다.

### `patchTypes.js`
- diff 단계에서 사용하는 patch type 상수를 정의합니다.
- 현재 `CREATE`, `REMOVE`, `REPLACE`, `TEXT`, `PROPS`, `MOVE`를 사용합니다.

---

## 현재 diff 규칙

`diff.js`는 아래 순서로 비교합니다.

1. `oldNode`가 없고 `newNode`가 있으면 `CREATE`
2. `oldNode`가 있고 `newNode`가 없으면 `REMOVE`
3. 노드 타입이 다르거나 element tag가 다르면 `REPLACE`
4. 두 노드가 모두 text node이고 내용이 다르면 `TEXT`
5. 두 노드가 같은 element 타입이면 props를 비교하고 필요 시 `PROPS`
6. 자식 노드를 pair로 묶은 뒤, 같은 key를 가진 노드의 위치가 바뀌면 `MOVE`
7. 각 자식 pair를 재귀적으로 다시 비교

---

## 자식 비교 방식

### key가 없는 경우
- `diffChildren.js`가 index 기준으로 자식을 pair로 묶습니다.
- 이 경우에도 `pathIndex`, `oldIndex`, `newIndex`, `key`를 모두 포함한 같은 pair 구조를 반환합니다.
- `key`는 `null`로 두고, `pathIndex`는 현재 index를 사용합니다.
- 즉, 기존 index 비교 흐름은 유지하되 `diff.js`가 예외 처리 없이 같은 계약을 읽을 수 있도록 맞춥니다.

### key가 있는 경우
- `keyedDiff.js`가 같은 key를 가진 old/new 자식을 먼저 매칭합니다.
- 새 트리에만 있는 key는 `CREATE` 대상입니다.
- 이전 트리에만 남은 key는 `REMOVE` 대상입니다.
- old/new 양쪽에 같은 key가 있고 위치만 달라지면 `MOVE` 대상이 됩니다.
- 이 비교 결과도 index 기반과 동일한 pair 계약으로 반환합니다.

---

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

---

## `MOVE` patch 의미

- `MOVE`는 같은 부모 안에서 기존 위치의 노드를 새 위치로 이동할 때 사용합니다.
- `path`는 기존 위치(`oldIndex`)를 가리킵니다.
- `to`는 새 위치(`newIndex`)를 뜻합니다.
- `to`는 숫자 값으로 고정합니다.
- `key`는 어떤 노드를 이동 대상으로 판단했는지 식별하기 위한 정보입니다.

---

## patch 정렬 규칙

같은 부모 아래에서 direct child patch가 함께 생성되는 경우, `diff.js`는 아래 순서에 맞춰 patch를 정리합니다.

1. `REMOVE`
2. `CREATE`
3. `MOVE`
4. `REPLACE`
5. `TEXT`
6. `PROPS`

이 순서는 patch 단계의 적용 규칙과 맞추기 위한 것입니다.

---

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

현재 `diff.js`는 `pathIndex`를 기준으로 재귀 path를 계산하므로, index 기반 비교와 key 기반 비교 모두 같은 pair 계약을 반환해야 합니다.

---

## `path`

- `path`는 루트부터 따라가는 index 기반 경로입니다.
- 예를 들어 `[0, 2]`는 루트의 첫 번째 자식 아래 세 번째 자식을 뜻합니다.
- `MOVE`의 경우 `path`는 기존 위치를 가리키고, `to`는 이동할 새 위치를 뜻합니다.

---

## key 사용 권장 사항

리스트형 데이터에서는 `index`나 표시용 문자열보다, 처음부터 고유하게 부여된 `id`를 `key`로 사용하는 것을 권장합니다.

이유:
- 같은 항목을 안정적으로 추적할 수 있습니다.
- 항목의 순서가 바뀌거나 중간 삽입/삭제가 발생해도 `MOVE`, `CREATE`, `REMOVE` 판단이 더 정확해집니다.
- 중복 key로 인한 비교 불안정을 줄일 수 있습니다.

예:
- 방 카드: `room-living`
- 기기 행: `device-living-light`

이 프로젝트에서는 아래 규칙으로 key를 읽습니다.

```js
props.key ?? props['data-key'] ?? null
```

따라서 UI 레이어에서는 고유 id를 `data-key`로 심어주는 방식이 가장 안전합니다.

---

## 중복 key 정책

- key 기반 비교는 같은 부모 안에서 key가 고유하다는 전제를 가집니다.
- 현재 구현은 중복 key를 감지하면 경고를 남기고, 매칭은 첫 번째 key를 기준으로 진행합니다.
- 따라서 실제 UI/데이터에서는 고유 id 기반 key를 유지하는 것이 중요합니다.

---

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

---

## 현재 상태와 한계

- key가 없는 경우는 index 기반 비교를 유지합니다.
- key가 있는 경우는 같은 key를 우선 매칭하는 keyed diff 구조를 사용합니다.
- `diff` 단계에서는 `MOVE` patch를 생성할 수 있습니다.
- `MOVE`는 같은 부모 direct child patch 기준 정렬 규칙에 맞춰 정리됩니다.
- 중복 key는 경고 후 첫 매칭 기준으로 동작합니다.
- 실제 안정성은 UI/데이터 쪽에서 고유 id 기반 key를 유지하는 것에 크게 의존합니다.

---

## 요약

- `diff.js`는 전체 diff 계산, `MOVE` 생성, patch 정렬의 중심입니다.
- `diffProps.js`는 props 변경만 계산합니다.
- `diffChildren.js`는 자식 비교 전략을 결정하고 pair 계약을 맞춥니다.
- `keyedDiff.js`는 key 기반 pair 생성과 이동 판단용 정보를 제공합니다.
- `patchTypes.js`는 patch type 계약을 한 곳에서 관리합니다.
- 리스트형 UI에서는 고유 id 기반 key를 사용하는 것이 가장 안전합니다.
