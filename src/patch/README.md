# patch (고등학생 버전 설명서)

이 폴더는 **diff가 만든 patch 목록**을 받아서  
**실제 화면 DOM에 반영**하는 역할을 합니다.

한 줄 요약:

- diff: "무엇이 바뀌었는지 찾는 팀"
- patch: "찾은 변경을 진짜 화면에 적용하는 팀"

---

## 0. 먼저 큰 그림

앱에서 Patch 버튼을 누르면 대략 이렇게 흘러갑니다.

1. 이전 상태(`oldTree`)와 새 상태(`newTree`)를 비교해서 patch 배열 생성
2. `applyPatches(rootNode, patches)` 호출
3. patch를 순서대로 적용
4. 실제 화면이 새 상태로 바뀜

즉, patch 폴더는 "비교 결과를 실행하는 마지막 단계"입니다.

---

## 1. 이 폴더 파일은 무엇을 하나?

### `applyPatch.js`

- patch 적용 메인 엔진
- patch 정렬 규칙 결정
- patch 타입별 실제 DOM 조작

### `domOps.js`

- path 인덱싱 기준 child 목록 추출
- path를 따라 노드를 찾는 함수 제공

---

## 2. patch 타입(명령 종류)

현재 엔진이 처리하는 타입:

- `CREATE`: 새 노드 만들기
- `REMOVE`: 기존 노드 지우기
- `MOVE`: 같은 부모 안에서 위치 이동
- `REPLACE`: 노드 통째로 교체
- `TEXT`: 텍스트만 바꾸기
- `UPDATE_PROPS`: 속성만 부분 수정

호환 규칙:

- diff가 옛 표기 `PROPS`를 보내도 내부에서 `UPDATE_PROPS`로 바꿔 처리합니다.

---

## 3. path가 뭐냐?

`path`는 "트리에서 어디를 고칠지"를 나타내는 주소입니다.

예:

- `[]` : 루트 노드 자체
- `[0]` : 루트의 첫 번째 자식
- `[0, 2]` : 루트의 첫 번째 자식의 세 번째 자식

주의:

- path 계산 시 모든 child를 세지 않습니다.
- `element` 노드 + 공백이 아닌 `text` 노드만 인덱싱합니다.
- 공백 text, comment는 제외합니다.

이 규칙은 `domOps.js`와 diff 쪽이 반드시 같아야 합니다.

---

## 4. 왜 "적용 순서"가 중요할까?

예를 들어 같은 부모에서:

- 0번을 삭제하고
- 2번을 수정하면

삭제를 먼저/나중에 하느냐에 따라 인덱스가 달라질 수 있습니다.  
이걸 **인덱스 밀림**이라고 생각하면 됩니다.

그래서 patch는 정렬 후 적용합니다.

---

## 5. 실제 정렬 규칙 (현재 코드 기준)

`applyPatches()`에서 patch를 이렇게 정렬합니다.

1. path가 더 깊은 것 먼저
2. 같은 부모면 patch 단계 우선순위 적용  
   `REMOVE -> CREATE -> MOVE -> REPLACE -> TEXT -> UPDATE_PROPS`
3. 같은 단계 내부에서는 타입별 기준 적용
   - `REMOVE`: 큰 인덱스부터
   - `CREATE`: 작은 인덱스부터
   - `MOVE`: `to` 작은 것부터
4. 나머지는 경로 역순 비교로 고정 순서 유지

핵심 목적:

- 구조가 바뀌는 patch를 먼저 처리
- 잘못된 대상을 고치는 문제를 줄이기

---

## 6. 타입별로 실제로 뭘 하나?

## 6-1. 루트(`path=[]`)일 때

- `CREATE` / `REPLACE`:
  - 새 루트 DOM을 렌더해서 반환
- `TEXT`:
  - 루트가 텍스트 노드면 텍스트 교체
- `UPDATE_PROPS`:
  - 루트 element 속성만 수정
- `REMOVE`:
  - 빈 text 노드로 대체
- `MOVE`:
  - 루트 자체 이동은 의미가 없어 보통 적용하지 않음

## 6-2. 비루트(`path` 길이 1 이상)일 때

1. `parentPath`로 부모 노드 찾기
2. `targetIndex`로 대상 자식 찾기
3. 타입에 맞게 처리

- `CREATE`: `insertBefore(anchor)`로 해당 위치 삽입
- `REMOVE`: 대상 있으면 제거
- `MOVE`: 기존 위치(path)에서 목표 위치(`to`)로 이동
  - `key`가 있으면 key로 다시 찾아 안정성 향상
- `REPLACE`: 대상 있으면 통교체
- `TEXT`: 대상이 텍스트 노드일 때만 변경
- `UPDATE_PROPS`: element 속성 부분 변경

---

## 7. `UPDATE_PROPS`는 어떻게 동작하나?

payload 예:

```js
{
  type: 'UPDATE_PROPS',
  path: [0, 1],
  props: {
    set: { class: 'active', 'data-state': 'on' },
    remove: ['disabled']
  }
}
```

동작:

1. `remove` 목록 속성 삭제
2. `set` 목록 속성 덮어쓰기

즉 "필요한 속성만" 바꾸는 방식입니다.

---

## 8. `MOVE`는 어떻게 연결되어 있나?

diff가 이런 patch를 만들 수 있습니다.

```js
{
  type: 'MOVE',
  path: [0, 3], // 기존 위치
  to: 1,        // 목표 위치
  key: 'device-light-1' // 선택
}
```

patch 단계에서는:

1. 이동 대상 노드를 찾고
2. 부모에서 분리한 뒤
3. `to` 인덱스 위치로 재삽입합니다.

`key`가 있으면 위치가 흔들려도 같은 노드를 다시 찾기 쉬워집니다.

---

## 9. 안전 장치

이 코드가 예외를 줄이기 위해 하는 것:

- 부모 노드를 못 찾으면 skip
- 대상 노드를 못 찾으면 skip
- patch마다 대상을 다시 탐색 (캐시 참조 재사용 안 함)

이유:

- 앞 patch가 DOM 구조를 이미 바꿨을 수 있기 때문

---

## 10. 현재 한계

- `MOVE`는 기본적으로 "같은 부모 안에서 위치 이동" 중심
- 부모가 바뀌는 고급 이동 시나리오는 별도 규칙이 더 필요
- key가 없으면 이동 정확도가 떨어질 수 있음

---

## 11. 디버깅 체크리스트

문제 생기면 아래 순서로 확인하세요.

1. patch `type/path/payload` 형식이 맞는가?
2. diff와 patch의 path 인덱싱 규칙이 같은가?
3. patch 정렬 순서가 의도대로 적용되는가?
4. `MOVE`의 `to` 값이 숫자인가?
5. `UPDATE_PROPS`가 `{ set, remove }` 형태인가?
6. 루트 교체 시 호출부가 반환 루트를 제대로 교체했는가?

---

## 12. 빠른 예시 (한 번에 감 잡기)

초기 자식:

`[A, B, C]`

patch:

1. `{ type: 'REMOVE', path: [0] }`
2. `{ type: 'CREATE', path: [1], node: X }`
3. `{ type: 'MOVE', path: [2], to: 0 }`

적용 후:

- 정렬 규칙에 따라 안전하게 처리되고
- 최종 배열은 인덱스 밀림을 최소화한 결과로 재구성됩니다.

핵심은 "패치 내용"보다 "적용 순서"가 결과를 크게 좌우한다는 점입니다.
