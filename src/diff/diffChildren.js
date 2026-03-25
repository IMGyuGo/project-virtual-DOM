import { collectKeyedPairs, hasAnyKey } from './keyedDiff.js';

// 자식 pair 객체의 기본 형태를 한 곳에서 만든다.
// index 기반 비교와 key 기반 비교가 같은 구조를 반환해야 diff.js가 분기 없이 안정적으로 읽을 수 있다.
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
// 다만 이후 diff.js가 같은 형태로 pair를 읽을 수 있도록 oldIndex/newIndex/key도 함께 맞춰서 반환한다.
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
// key가 있으면 key 우선 비교로 같은 노드를 추적하고, 없으면 기존처럼 index 기준 비교를 유지한다.
export function collectChildPairs(oldChildren = [], newChildren = []) {
  if (hasAnyKey(oldChildren) || hasAnyKey(newChildren)) {
    return collectKeyedPairs(oldChildren, newChildren);
  }

  return collectIndexPairs(oldChildren, newChildren);
}
