import { collectKeyedPairs, hasAnyKey } from './keyedDiff.js';

// 자식 pair 객체의 기본 형태를 한 곳에서 만든다.
// diff.js는 pathIndex / oldIndex / newIndex / key가 항상 있다고 가정하고 동작하므로,
// index 기반 비교도 key 기반 비교와 같은 계약을 반환하도록 여기서 구조를 통일한다.
function createChildPair({
  oldChild = null,
  newChild = null,
  pathIndex,
  oldIndex = null,
  newIndex = null,
  key = null,
}) {
  return {
    oldChild,
    newChild,
    pathIndex,
    oldIndex,
    newIndex,
    key,
  };
}

// key가 없는 자식 배열은 기존 방식대로 index 기준으로 짝을 만든다.
// 다만 이후 diff.js가 예외 처리 없이 같은 형태로 pair를 읽을 수 있도록,
// oldIndex / newIndex / key까지 함께 채워 key 기반 비교와 동일한 계약으로 반환한다.
function collectIndexPairs(oldChildren = [], newChildren = []) {
  const max = Math.max(oldChildren.length, newChildren.length);

  return Array.from({ length: max }, (_, index) =>
    createChildPair({
      oldChild: oldChildren[index] ?? null,
      newChild: newChildren[index] ?? null,
      pathIndex: index,
      oldIndex: oldChildren[index] != null ? index : null,
      newIndex: newChildren[index] != null ? index : null,
      key: null,
    }),
  );
}

// 자식 노드를 어떤 기준으로 짝지을지 결정한다.
// key가 하나라도 있으면 keyed 비교를 사용해 같은 노드를 더 안정적으로 추적하고,
// key가 없을 때만 기존 index 비교를 유지해 이전 동작과의 호환성을 지킨다.
export function collectChildPairs(oldChildren = [], newChildren = []) {
  if (hasAnyKey(oldChildren) || hasAnyKey(newChildren)) {
    return collectKeyedPairs(oldChildren, newChildren);
  }

  return collectIndexPairs(oldChildren, newChildren);
}
