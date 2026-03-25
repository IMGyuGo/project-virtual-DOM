# diff

`src/diff`는 이전 Virtual DOM 트리와 다음 Virtual DOM 트리를 비교해, 이후 실제 DOM에 반영할 수 있는 patch 목록을 만드는 모듈입니다.

## 파일 구성

- `diff.js`
  - 트리 비교의 메인 진입점입니다.
  - `diff(oldTree, newTree)`를 export 합니다.
  - 내부의 재귀 `walk` 함수로 patch 객체를 누적합니다.

- `diffProps.js`
  - props 변경만 따로 계산합니다.
  - 반환 형식은 `{ set, remove }`입니다.

- `diffChildren.js`
  - 재귀 비교를 위해 이전 자식과 다음 자식을 pair로 묶습니다.
  - 현재는 `key`가 있어도 실제 비교는 index 기준으로 진행합니다.

- `keyedDiff.js`
  - 자식 element 중 `key`를 가진 노드가 있는지 확인합니다.
  - 아직 key 기반 재배치 로직은 구현되어 있지 않습니다.

- `patchTypes.js`
  - 이 폴더에서 사용하는 patch type 상수를 정의합니다.

## 현재 diff 규칙

`diff.js`는 아래 순서로 비교합니다.

1. `oldNode`가 없고 `newNode`가 있으면 `CREATE`
2. `oldNode`가 있고 `newNode`가 없으면 `REMOVE`
3. 노드 타입이 다르거나 element tag가 다르면 `REPLACE`
4. 두 노드가 모두 text node이고 내용이 다르면 `TEXT`
5. 두 노드가 같은 element 타입이면 props를 비교하고 필요 시 `PROPS`
6. `collectChildPairs()`로 자식을 묶은 뒤 각 pair를 재귀 비교

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
];
```

### `path`

- `path`는 루트부터 따라가는 index 기반 경로입니다.
- 예를 들어 `[0, 2]`는 루트의 첫 번째 자식 아래 세 번째 자식을 뜻합니다.

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

## 현재 한계

- key가 있는 자식은 감지할 수 있지만, 아직 key 기반 diff는 수행하지 않습니다.
- 자식 비교는 사실상 모든 경우에 index 기반입니다.
- `MOVE` patch type이 없어서 재정렬 최적화는 아직 지원하지 않습니다.

## 요약

- 이 폴더의 핵심 결과물은 `patches` 배열입니다.
- `diffProps.js`는 props 변경을 계산합니다.
- `diffChildren.js`는 자식 노드를 어떻게 짝지을지 결정합니다.
- 앞으로 확장 가능성이 큰 지점은 `keyedDiff.js`와 `diffChildren.js`입니다.
