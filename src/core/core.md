# Core 역할 정리

## 1. Core가 맡는 일

Core는 이 프로젝트의 Virtual DOM 기준점을 만든다.  
한 문장으로 정리하면, **"실제 DOM을 일관된 VDOM 구조로 바꾸고, 그 VDOM을 다시 DOM으로 안정적으로 복원할 수 있게 만드는 기반 레이어"** 다.

현재 프로젝트에서 Core가 책임지는 범위는 아래와 같다.

- `src/core/*`
- VNode 스키마 정의
- DOM -> VDOM 변환 규칙
- VDOM -> DOM 렌더링 규칙
- Diff / Patch 팀이 따라야 하는 노드 구조 계약

즉 Diff 팀이 비교하는 대상도 Core가 만든 VDOM이고, Patch 팀이 적용하는 기준 구조도 Core가 정한 규칙을 따른다.

## 2. Core가 담당하는 파일

- `src/core/vnode.js`
- `src/core/domToVdom.js`
- `src/core/renderVdom.js`

각 파일의 역할은 아래처럼 나뉜다.

### `src/core/vnode.js`

이 파일은 "이 프로젝트의 VDOM 노드가 어떤 모양의 객체인지"를 정한다.

주요 함수:

- `createElementVNode(tag, props, children)`
- `createTextVNode(text)`
- `isVNode(value)`

#### `createElementVNode(tag, props = {}, children = [])`

element node를 표현하는 VNode를 만든다.

출력 형태:

```js
{
  type: 'element',
  tag,
  props,
  key,
  children,
}
```

여기서 중요한 부분은 `key` 규칙이다.

```js
const key = props.key ?? props['data-key'] ?? null;
```

이 규칙이 중요한 이유:

- 방 카드에는 `data-key="room-living"` 같은 값이 들어간다.
- 각 장치 row에도 `data-key="device-living-light"` 같은 값이 들어간다.
- 따라서 Core가 `data-key`를 `VNode.key`로 올려줘야 Diff 단계에서 keyed 비교와 reorder 판단이 가능해진다.

현재 프로젝트에서는 room reorder뿐 아니라, 장치 단위 식별도 이 규칙 위에서 더 안정적으로 다룰 수 있다.

#### `createTextVNode(text)`

문자열 내용을 표현하는 text VNode를 만든다.

출력 형태:

```js
{
  type: 'text',
  text,
}
```

이 함수가 중요한 이유:

- 시간 `14:00`
- 에너지 사용량 `4.2kWh`
- 장치 상태 `ON`, `OFF`, `RUNNING`, `OFF`
- 테마 버튼 텍스트

같은 문자열 변화를 element 전체 교체 없이 text node 변경으로 추적할 수 있게 해주기 때문이다.

#### `isVNode(value)`

어떤 값이 현재 프로젝트 기준의 VNode인지 확인하는 guard다.

현재는 아래 조건만 본다.

- `value`가 truthy인지
- `value.type === 'element'` 또는 `value.type === 'text'`인지

즉, 정교한 스키마 검증보다는 "우리 시스템이 다루는 최소 형태인지"를 판별하는 용도다.

### `src/core/domToVdom.js`

이 파일은 실제 DOM을 읽어서 VDOM으로 변환한다.  
브라우저 DOM을 Diff가 다루기 쉬운 순수 데이터 구조로 바꾸는 입구다.

주요 함수:

- `isIgnorableText(node)`
- `getElementProps(el)`
- `domToVdom(node)`

#### `isIgnorableText(node)`

공백만 있는 text node인지 검사한다.

현재 구현 기준:

```js
return node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '';
```

이 규칙이 중요한 이유:

- 줄바꿈과 들여쓰기 때문에 생기는 공백 text node를 children에 포함시키면
- 사람이 보는 구조와 Diff가 계산하는 구조가 달라지고
- 그 결과 `path`, patch target, tree highlight가 함께 어긋날 수 있다.

즉 Core는 "의미 없는 공백 text는 children에 넣지 않는다"는 규칙을 고정한다.

#### `getElementProps(el)`

실제 DOM element의 attribute를 plain object로 수집한다.

예:

```html
<article class="room-card" data-room="living" data-key="room-living" data-theme="light"></article>
```

이 element는 대략 아래 props로 변환된다.

```js
{
  class: 'room-card',
  'data-room': 'living',
  'data-key': 'room-living',
  'data-theme': 'light',
}
```

현재 프로젝트는 React처럼 special prop을 해석하지 않고, DOM attribute를 그대로 object로 복사하는 단순 규칙을 사용한다.

이 방식 덕분에 아래 값들이 모두 자연스럽게 Diff 대상이 된다.

- `data-mode`
- `data-active`
- `data-power`
- `data-state`
- `data-theme`
- `value`
- `draggable`
- `aria-pressed`

#### `domToVdom(node)`

이 파일의 핵심 함수다.  
DOM 한 노드를 읽어서 그 아래 subtree 전체를 VDOM subtree로 바꾼다.

실행 순서:

1. `node`가 없으면 `null` 반환
2. text node면 `createTextVNode(node.textContent)` 반환
3. element node가 아니면 `null` 반환
4. `getElementProps(node)`로 props 수집
5. `node.childNodes`를 순회하며 자식을 재귀적으로 `domToVdom(child)` 수행
6. comment node와 공백-only text node는 제외
7. 살아남은 자식만 `children[]`에 순서대로 push
8. 마지막에 `createElementVNode(node.tagName.toLowerCase(), props, children)` 반환

핵심 포인트:

- `childNodes`를 순회하므로 text node도 구조 안에 포함된다.
- 다만 공백-only text와 comment는 버린다.
- `tagName.toLowerCase()`로 태그 이름을 정규화해 Diff 기준을 흔들리지 않게 한다.

현재 프로젝트에서 `domToVdom()`가 중요한 장면:

1. 초기 부팅 시 `actualRoot`의 샘플 DOM을 `initialTree`로 만들 때
2. 사용자가 `testRoot`를 수정한 뒤 draft diff를 계산할 때
3. Patch 직전에 최신 `nextTree`를 만들 때

즉 `domToVdom()`는 단순 변환 함수가 아니라, **현재 화면 상태를 Diff 가능한 데이터로 바꾸는 입구**다.

### `src/core/renderVdom.js`

이 파일은 VDOM을 다시 실제 DOM으로 렌더링한다.  
`domToVdom()`가 DOM -> VDOM 방향이라면, `renderVdom()`는 그 반대 방향이다.

주요 함수:

- `setProps(el, props)`
- `renderVdom(vnode)`
- `mountVdom(container, vnode)`

#### `setProps(el, props = {})`

VDOM의 `props`를 실제 DOM attribute에 반영한다.

현재 구현:

```js
for (const [name, value] of Object.entries(props)) {
  el.setAttribute(name, value);
}
```

이 규칙 덕분에 아래 속성들이 모두 같은 방식으로 복원된다.

- `data-*`
- `class`
- `id`
- `type`
- `value`
- `draggable`
- `aria-*`

즉 room 카드의 `data-theme`, 장치 row의 `data-key`, 드래그 핸들의 `draggable`, 버튼의 상태 attribute 모두 Core 렌더 규칙 위에서 복원된다.

#### `renderVdom(vnode)`

VNode 하나를 실제 DOM Node 하나로 바꾸고, 자식까지 재귀적으로 복원한다.

실행 순서:

1. `vnode`가 없으면 빈 text node 생성
2. `vnode.type === 'text'`면 `document.createTextNode(vnode.text)` 반환
3. element면 `document.createElement(vnode.tag)` 생성
4. `setProps(el, vnode.props)` 적용
5. `vnode.children`을 순회하며 각 child를 재귀 렌더 후 append
6. 최종 element 반환

즉 이 함수는 단순한 태그 생성기가 아니라, **VDOM subtree를 실제 DOM subtree로 복원하는 재귀 렌더러**다.

#### `mountVdom(container, vnode)`

렌더된 결과를 특정 컨테이너에 통째로 붙인다.

현재 구현:

```js
container.replaceChildren(renderVdom(vnode));
```

현재 프로젝트에서 쓰이는 장면:

- 초기 `testRoot` 렌더
- undo/redo로 `actualRoot`, `testRoot`를 통째로 복원할 때

즉 부분 patch가 아니라 "현재 트리를 이 영역의 공식 DOM 상태로 다시 깐다"는 의미를 가진다.

## 3. 현재 프로젝트에서 Core가 특히 중요한 이유

이 프로젝트는 VDOM을 계산만 하는 데서 끝나지 않는다.  
Core의 규칙은 아래 기능들과 직접 연결된다.

- `actualRoot` 실제 반영 화면
- `testRoot` 편집용 실험 화면
- draft diff 계산
- patch log 출력
- Tree Visualizer 렌더링
- patch target highlight
- undo/redo 복원

특히 `domToVdom()`의 child filtering 규칙이 흔들리면 아래가 같이 무너질 수 있다.

- Diff의 `path`
- Patch 적용 대상
- `jsonTreeViewer`의 `nodeAtPath()` 추적
- graph node highlight
- undo/redo 후 구조 해석

## 4. Core가 다른 팀에 넘겨야 하는 계약

### Diff 팀에게

- 비교 대상은 Core가 만든 `VNode` 구조만 사용
- `key`는 `props.key ?? props['data-key'] ?? null`
- 자식 비교 순서는 필터링된 `children[]` 기준
- room card와 device row는 `data-key` 기반 식별이 가능하다고 가정
- type/tag가 다르면 subtree `REPLACE` 가능
- text 변경은 별도 text VNode 비교로 처리

### Patch 팀에게

- patch의 `path`는 Core의 `children[]` 순서를 그대로 따른다
- 렌더된 DOM 구조도 Core의 VDOM 구조와 같은 순서를 유지해야 한다
- text node와 element node를 구분한 채 유지해야 한다
- props는 현재 기준으로 DOM attribute에 직접 반영된다고 가정한다

## 5. Smart Home 데모에서 Core가 받쳐주는 변화

현재 Nexus Home 데모에서 Core 구조 위에 올라타는 변화는 아래와 같다.

- 전등 ON/OFF 변경
- 에어컨 RUNNING/STOPPED 변경
- 에어컨 온도 숫자 변경
- 카메라 recording/idle 변경
- away mode 토글
- room card reorder
- room card light/dark 테마 토글
- 테마 버튼 텍스트 변경

즉 Patch Log에서 보이는 `PROPS`, `TEXT`, `MOVE`, `REPLACE` 같은 변화는 모두 Core가 만든 노드 구조 안정성을 전제로 한다.

## 6. 한 줄 요약

Core는 **"VDOM의 형태를 정의하고, 실제 DOM과 VDOM 사이를 안정적으로 왕복 변환하는 기반 역할"** 이다.  
현재 프로젝트에서는 `createElementVNode()`, `createTextVNode()`, `domToVdom()`, `renderVdom()`의 규칙이 그대로 Diff, Patch, History, Tree Preview, Highlight 로직의 전제가 된다.
