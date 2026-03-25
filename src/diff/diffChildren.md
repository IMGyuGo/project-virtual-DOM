# diffChildren

`diffChildren.js`의 역할은 "자식 노드를 어떤 기준으로 짝지을지(pairing) 결정"하는 것입니다.

핵심은 비교 자체가 아니라, `diff.js`가 비교하기 쉽게 **pair 형식을 통일**해서 넘기는 데 있습니다.

## 왜 필요한가

`diff.js`가 직접 아래를 모두 처리하면 복잡해집니다.

- key 없는 리스트: index 기준 비교
- key 있는 리스트: key 기준 비교

그래서 `diffChildren.js`가 분기만 담당하고, `diff.js`는 "pair 받아서 walk"만 하도록 분리했습니다.

## 현재 동작

`collectChildPairs(oldChildren, newChildren)`는 아래 규칙으로 동작합니다.

1. old/new 중 하나라도 key가 있으면:
- `keyedDiff.js`의 `collectKeyedPairs()` 호출

2. 둘 다 key가 없으면:
- 내부 `collectIndexPairs()`로 index 기준 pair 생성

## 반환 pair 형식

`diffChildren.js`와 `keyedDiff.js`는 같은 형태를 반환합니다.

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

필드 의미:

- `oldChild`: 이전 트리 자식
- `newChild`: 다음 트리 자식
- `pathIndex`: 재귀 `walk`에서 path를 이어갈 때 사용할 인덱스
- `oldIndex`: 이전 배열 위치
- `newIndex`: 다음 배열 위치
- `key`: key 기반 비교 시 사용된 key

## index 기준 예시

old: `[A, B, C]`  
new: `[A, X, C]`

생성되는 pair는 index 단위로 묶입니다.

- 0번: `A ↔ A`
- 1번: `B ↔ X`
- 2번: `C ↔ C`

## key 기준 예시

old: `[{key:1,A}, {key:2,B}, {key:3,C}]`  
new: `[{key:2,B}, {key:3,C}, {key:1,A}]`

생성되는 pair는 key 기준으로 묶입니다.

- key=1: oldIndex=0, newIndex=2
- key=2: oldIndex=1, newIndex=0
- key=3: oldIndex=2, newIndex=1

이 정보로 `diff.js`는 `MOVE` patch 후보를 만들 수 있습니다.

## diff.js와 연결 포인트

`diff.js`는 pair를 순회하면서:

- `pair.pathIndex`로 재귀 path를 계산
- `oldIndex/newIndex/key`로 `MOVE` patch 후보 판단

즉, `diffChildren.js`는 "전략 선택 + pair 형식 통일", `diff.js`는 "실제 patch 생성"을 담당합니다.

## 요약

- `diffChildren.js`는 불필요한 중복이 아니라 역할 분리 포인트입니다.
- 이 파일 덕분에 index 비교와 key 비교를 바꿔도 `diff.js` 코어 로직은 크게 흔들리지 않습니다.
