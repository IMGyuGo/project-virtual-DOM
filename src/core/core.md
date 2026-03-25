# Core 역할 정리

## 1. Core가 담당하는 부분

Core는 이 프로젝트의 Virtual DOM 기준점을 만드는 역할이다.  
한마디로 정리하면, **"실제 DOM을 일관된 VDOM 구조로 바꾸고, 다시 그 VDOM을 DOM으로 그릴 수 있게 만드는 기반 레이어"** 를 담당한다.

팀 기준 역할 분리에서 Core는 다음을 소유한다.

- `src/core/*`
- `VNode` 스키마 정의
- DOM -> VDOM 변환 규칙
- VDOM -> DOM 렌더링 규칙
- Diff / Patch 팀이 따라야 할 노드 구조 계약 문서

즉, Diff 팀이 비교할 대상도 Core가 만든 VDOM이고, Patch 팀이 적용할 기준 구조도 Core가 만든 규칙을 따라야 한다.

## 2. 현재 프로젝트에서 Core가 맡는 파일

- `src/core/vnode.js`
- `src/core/domToVdom.js`
- `src/core/renderVdom.js`

현재 코드 기준으로 보면 역할은 이렇게 나뉜다.

### `src/core/vnode.js`

- `createElementVNode(tag, props, children)`
- `createTextVNode(text)`
- `isVNode(value)`

여기서는 VNode의 기본 형태를 만든다.  
특히 `key`는 `props.key` 또는 `props['data-key']` 에서 가져오므로, 이후 Diff 팀은 이 규칙을 그대로 전제로 구현해야 한다.

### `src/core/domToVdom.js`

- 실제 DOM 노드를 읽어서 VDOM 객체로 변환
- 공백만 있는 텍스트 노드는 제외
- comment node는 제외
- element node와 text node를 구분해서 처리

이 파일은 **child filtering rule** 을 사실상 결정하는 핵심 파일이다.  
이 규칙이 흔들리면 Diff와 Patch에서 사용하는 `path` 인덱스가 전부 어긋날 수 있다.

### `src/core/renderVdom.js`

- VDOM을 다시 실제 DOM으로 렌더링
- element/text 노드별 생성 처리
- props를 DOM attribute로 반영
- `mountVdom(container, vnode)` 로 실제 화면에 붙임

이 파일은 Core가 만든 VDOM 구조가 실제 DOM으로 안정적으로 복원되는지 보장하는 역할이다.

## 3. Core의 핵심 구현 책임

Core는 아래 4가지를 끝내야 한다.

### 1. VNode 스키마 고정

기본 계약은 아래처럼 유지하는 것이 좋다.

```js
{
  type: "element" | "text",
  tag: "div",
  props: {},
  children: [],
  key: null,
  text: ""
}
```

현재 구현에서는 text node가 `type`, `text`만 가지므로, 팀 문서에서는 "공식 스키마"와 "실제 구현 최소 필드"를 같이 설명해 두는 것이 안전하다.

### 2. DOM -> VDOM 변환 규칙 확정

Core가 반드시 먼저 확정해야 하는 규칙:

- element node만 `tag`, `props`, `children`을 가진다
- text node는 명시적으로 별도 VNode로 만든다
- comment node는 무시한다
- 공백만 있는 text node는 무시한다
- children 배열의 순서가 곧 `path` 인덱스 기준이 된다

이 규칙은 Diff, Patch 팀이 그대로 따라야 한다.

### 3. VDOM -> DOM 렌더링 보장

Core는 만들어진 VDOM이 다시 DOM으로 렌더될 수 있어야 한다.

- 같은 VDOM 입력이면 항상 같은 구조의 DOM이 나와야 한다
- text/element 처리 방식이 일관되어야 한다
- props 반영 방식이 단순하고 예측 가능해야 한다

### 4. 다른 팀을 위한 계약 문서 제공

Core는 코드를 만드는 것만으로 끝나지 않는다.  
반드시 Diff / Patch 팀에게 아래 내용을 문서로 넘겨야 한다.

- VNode shape
- key 추출 규칙
- child filtering rule
- path 인덱싱 기준
- 렌더링 시 attribute 처리 기준

## 4. Core 완료 기준

Core 파트는 아래 조건을 만족하면 완료로 볼 수 있다.

- 같은 DOM 입력에서 항상 같은 VDOM 출력이 나온다
- 렌더 결과가 원래 VDOM 구조와 구조적으로 같게 나온다
- text node / element node 처리 규칙이 문서화되어 있다
- comment / 공백 텍스트 필터링 규칙이 고정되어 있다
- `key` 추출 규칙이 팀에 공유되어 있다
- Diff 팀이 path 계산을 시작할 수 있을 정도로 계약이 명확하다

## 5. Core가 특히 조심해야 하는 리스크

### 리스크

child filtering 규칙이 애매하면 `path` 인덱스가 틀어진다.

예를 들어 Core는 공백 text를 제외했는데, Diff나 Patch가 이를 포함해서 생각하면 같은 노드를 서로 다른 path로 가리키게 된다.

### 대응

아래 규칙을 먼저 고정하고 팀에 공유한다.

- comment node 제외
- trim 결과가 빈 문자열인 text node 제외
- 남은 children만 배열에 넣고, 그 순서를 path 기준으로 사용

## 6. Diff / Patch 팀으로 넘기는 handoff 계약

Core가 넘겨야 할 핵심 handoff는 아래와 같다.

### Diff 팀에게

- 비교 대상은 Core가 만든 `VNode` 구조만 사용
- `key`는 `props.key ?? props['data-key'] ?? null`
- 자식 비교 순서는 필터링된 `children[]` 기준
- tag/type이 다르면 subtree `REPLACE` 가능

### Patch 팀에게

- patch의 `path`는 Core의 `children[]` 순서를 그대로 따른다
- 렌더된 DOM 구조도 Core의 VDOM 구조와 동일한 순서를 유지해야 한다
- text node와 element node 구분을 그대로 유지해야 한다

## 7. Smart Home 대시보드 데모에서 Core가 하는 일

이번 주제가 Smart Home Device Control Dashboard라면 Core는 UI를 예쁘게 만드는 담당이 아니라, **장치 카드 상태를 안정적으로 표현할 수 있는 VDOM 기반을 만드는 담당** 이다.

예를 들면 아래 변화가 모두 Core 구조 위에서 동작해야 한다.

- 전등 `on -> off` 변경: props 또는 text 차이로 추적 가능해야 함
- 온도 `24 -> 25` 변경: text 또는 props 차이로 추적 가능해야 함
- offline placeholder -> live device card 교체: subtree replacement가 가능해야 함

즉, Patch Log 데모에서 보이는 `UPDATE_PROPS`, `TEXT`, `REPLACE`는 Diff/Patch 팀이 처리하더라도, 그 전제가 되는 노드 구조 안정성은 Core가 만든다.

## 8. 하루 작업 기준으로 Core가 먼저 끝내야 하는 우선순위

### 1순위

- `VNode` 스키마 고정
- `key` 규칙 고정
- child filtering rule 고정

### 2순위

- `domToVdom.js` 안정화
- `renderVdom.js` 안정화

### 3순위

- Diff / Patch 팀에게 공유할 짧은 계약 문서 정리
- 샘플 Smart Home 카드 DOM으로 round-trip 확인

## 9. 내가 Core 담당으로서 바로 해야 할 일

- `src/core/vnode.js`의 VNode 계약을 팀 기준 문서와 맞춘다
- `src/core/domToVdom.js`의 필터링 규칙을 팀에 먼저 공유한다
- `src/core/renderVdom.js`로 VDOM이 다시 DOM으로 안정적으로 그려지는지 확인한다
- 샘플 장치 카드 1~2개로 DOM -> VDOM -> DOM 흐름을 검증한다
- Diff 팀에게 `children path 기준`과 `key 규칙`을 먼저 전달한다

## 10. 한 줄 요약

Core는 **"VDOM의 형태를 정의하고, 실제 DOM과 VDOM 사이를 안정적으로 변환하는 기반 역할"** 이다.  
이 파트가 흔들리면 Diff, Patch, Patch Log 데모가 전부 흔들리기 때문에, 가장 먼저 계약을 고정하고 넘겨주는 것이 Core의 핵심 책임이다.
