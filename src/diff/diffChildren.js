import { collectKeyedPairs, hasAnyKey } from './keyedDiff.js';

// key가 없는 자식 배열은 기존 방식대로 index 기준으로 짝을 만든다.
// 기존 동작을 유지해야 key를 쓰지 않는 화면에서 diff 결과가 갑자기 달라지지 않는다.
function collectIndexPairs(oldChildren = [], newChildren = []) {
  const max = Math.max(oldChildren.length, newChildren.length);

  return Array.from({ length: max }, (_, index) => ({
    oldChild: oldChildren[index] ?? null,
    newChild: newChildren[index] ?? null,
    pathIndex: index,
  }));
}

// 자식 노드를 어떤 기준으로 짝지을지 결정한다.
// key가 있으면 key 우선 비교로 같은 노드를 추적하고, 없으면 기존처럼 index 기준 비교를 유지한다.
export function collectChildPairs(oldChildren = [], newChildren = []) {
  if (hasAnyKey(oldChildren) || hasAnyKey(newChildren)) {
    return collectKeyedPairs(oldChildren, newChildren);
  }

  return collectIndexPairs(oldChildren, newChildren);
}
