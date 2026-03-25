import { PATCH_TYPES } from './patchTypes.js';
import { diffProps } from './diffProps.js';
import { collectChildPairs } from './diffChildren.js';

// 두 노드가 같은 종류의 노드인지 확인한다.
// 같은 타입과 같은 tag여야 props 비교와 자식 비교를 이어갈 수 있으므로, 여기서 다르면 REPLACE로 처리한다.
function isSameType(oldNode, newNode) {
  if (!oldNode || !newNode) return false;
  if (oldNode.type !== newNode.type) return false;
  if (oldNode.type === 'text') return true;
  return oldNode.tag === newNode.tag;
}

// 이전 트리와 다음 트리를 재귀적으로 비교해 patch 목록을 누적한다.
// 노드 단위 변경을 먼저 판별하고, 같은 노드라고 판단될 때만 props와 children 비교로 내려간다.
function walk(oldNode, newNode, path, patches) {
  if (!oldNode && newNode) {
    patches.push({ type: PATCH_TYPES.CREATE, path, node: newNode });
    return;
  }

  if (oldNode && !newNode) {
    patches.push({ type: PATCH_TYPES.REMOVE, path });
    return;
  }

  if (!isSameType(oldNode, newNode)) {
    patches.push({ type: PATCH_TYPES.REPLACE, path, node: newNode });
    return;
  }

  if (oldNode.type === 'text' && newNode.type === 'text') {
    if (oldNode.text !== newNode.text) {
      patches.push({ type: PATCH_TYPES.TEXT, path, text: newNode.text });
    }
    return;
  }

  const propDelta = diffProps(oldNode.props, newNode.props);
  if (Object.keys(propDelta.set).length > 0 || propDelta.remove.length > 0) {
    patches.push({ type: PATCH_TYPES.PROPS, path, props: propDelta });
  }

  const pairs = collectChildPairs(oldNode.children, newNode.children);

  // 자식 비교 결과에서 path 계산에 사용할 index를 분리해서 읽는다.
  // 이렇게 해두면 index 기반 비교와 key 기반 비교가 모두 같은 walk 로직을 재사용할 수 있다.
  for (const pair of pairs) {
    const pathIndex = pair.pathIndex ?? pair.index;
    walk(pair.oldChild, pair.newChild, [...path, pathIndex], patches);
  }
}

// 외부에서는 이전 트리와 다음 트리만 넘기면 되도록 diff 진입점을 단순하게 유지한다.
// 내부 재귀 구현을 감춘 채 patch 배열만 반환하면 호출부가 알고리즘 세부사항에 의존하지 않아도 된다.
export function diff(oldTree, newTree) {
  const patches = [];
  walk(oldTree, newTree, [], patches);
  return patches;
}
