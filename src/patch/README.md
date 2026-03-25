# patch

`src/patch`는 diff 결과(patch 배열)를 실제 DOM에 반영하는 모듈입니다.
목표는 "최소 변경 적용"과 "인덱스 밀림 최소화"입니다.

## 파일 구성

- `applyPatch.js`
  - patch 적용 메인 엔진
  - patch 타입 정규화(`PROPS` -> `UPDATE_PROPS`)
  - patch 정렬(깊은 path 우선, 형제는 큰 index 우선)
  - 단일 patch 적용(`CREATE`, `REMOVE`, `REPLACE`, `TEXT`, `UPDATE_PROPS`)
- `domOps.js`
  - path 탐색 보조 유틸
  - path 인덱싱 대상 child 목록 추출
  - 루트에서 특정 path로 대상 노드 탐색

## Patch 계약

현재 patch 엔진이 처리하는 타입:

- `CREATE`
- `REMOVE`
- `REPLACE`
- `TEXT`
- `UPDATE_PROPS`

호환 규칙:

- diff에서 레거시 타입 `PROPS`가 와도 내부에서 `UPDATE_PROPS`로 정규화해서 처리합니다.

payload 형태:

- `CREATE` / `REPLACE`: `node`
- `TEXT`: `text`
- `UPDATE_PROPS`: `props`
  - `props.set`: 적용/덮어쓰기할 속성
  - `props.remove`: 삭제할 속성 키 배열

## path 규칙

- `path`는 루트 기준 index 경로입니다.
- `[]`는 루트 노드 자체를 의미합니다.
- `[0, 2]`는 "루트의 0번 자식의 2번 자식"을 의미합니다.
- path 인덱싱 시 다음 노드만 카운트합니다.
  - element 노드
  - 공백이 아닌 text 노드
- comment 노드/공백 text 노드는 제외합니다.

## 적용 순서(중요)

`applyPatches()`는 patch를 바로 순회하지 않고 먼저 정렬합니다.

정렬 규칙:

1. path depth가 깊은 patch 먼저
2. 같은 부모 아래 형제 patch는 index가 큰 patch 먼저
3. 나머지는 path 역순 비교로 결정적 순서 유지

이유:

- `REMOVE`/`REPLACE`가 섞일 때 앞 index를 먼저 건드리면 뒤 index 대상이 밀릴 수 있습니다.
- 깊은 노드부터, 그리고 형제는 큰 index부터 처리해야 이런 부작용을 줄일 수 있습니다.

## 타입별 동작

루트 patch (`path=[]`) 처리:

- `CREATE`/`REPLACE`: 새 루트 DOM을 렌더해 반환
- `TEXT`: 루트가 text 노드일 때만 반영
- `UPDATE_PROPS`: 루트 element 속성만 부분 반영
- `REMOVE`: 빈 text 노드로 대체해 참조 흐름 유지

비루트 patch 처리:

- `parentPath`로 부모를 찾고, `targetIndex`로 대상 자식 접근
- `CREATE`: `insertBefore(anchor)` 방식으로 index 위치 삽입
- `REMOVE`: 대상이 있을 때만 제거
- `REPLACE`: 대상이 있을 때만 교체
- `TEXT`: 대상이 text 노드일 때만 텍스트 교체
- `UPDATE_PROPS`: 대상 element 속성 부분 갱신

안전 장치:

- 부모/대상을 못 찾으면 예외 대신 skip합니다.
- patch마다 대상을 재탐색합니다.
  - 이전 patch가 DOM 구조를 바꿨을 수 있기 때문입니다.

## 호출부 기준 흐름

`app.js` 기준:

1. `diff(prevTree, nextTree)`로 patch 생성
2. `applyPatches(currentActualNode, patches)` 호출
3. 반환된 루트가 바뀌었으면 실제 영역 루트 교체

## 현재 한계

- `MOVE` 타입을 지원하지 않습니다.
- keyed reorder는 diff 쪽에서 1차 정리되어도, patch는 index 기반 적용이 기본입니다.
- 따라서 "순서 재배치만 있는 케이스"는 별도 정책/확장이 필요합니다.

## 디버깅 체크리스트

- patch path가 `domOps` 인덱싱 기준(element + 의미 있는 text)과 일치하는지 확인
- 같은 부모 형제 patch 순서가 큰 index 우선으로 적용되는지 확인
- `UPDATE_PROPS` payload가 `{ set, remove }` 형태인지 확인
- 루트 교체 케이스에서 반환 루트를 호출부가 교체 처리하는지 확인
