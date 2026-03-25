import { hasAnyKey } from './keyedDiff.js';

export function collectChildPairs(oldChildren = [], newChildren = []) {
  const max = Math.max(oldChildren.length, newChildren.length);

  // TODO(team-diff): key 기반 최소 이동 알고리즘으로 교체
  if (hasAnyKey(oldChildren) || hasAnyKey(newChildren)) {
    return Array.from({ length: max }, (_, i) => ({
      oldChild: oldChildren[i] ?? null,
      newChild: newChildren[i] ?? null,
      index: i,
    }));
  }

  return Array.from({ length: max }, (_, i) => ({
    oldChild: oldChildren[i] ?? null,
    newChild: newChildren[i] ?? null,
    index: i,
  }));
}
