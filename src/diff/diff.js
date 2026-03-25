import { PATCH_TYPES } from './patchTypes.js';
import { diffProps } from './diffProps.js';
import { collectChildPairs } from './diffChildren.js';

// patchTypes.js에 MOVE가 아직 없더라도 diff 단계에서 이동 patch를 만들 수 있도록 기본값을 둔다.
// 이후 patchTypes.js가 확장되면 같은 문자열을 공유하게 되고, 지금 단계에서도 중간 작업본이 깨지지 않는다.
const PATCH_TYPE_MOVE = PATCH_TYPES.MOVE ?? 'MOVE';

// 두 노드가 같은 종류의 노드인지 확인한다.
// 같은 타입과 같은 tag여야 props 비교와 자식 비교를 이어갈 수 있으므로, 여기서 다르면 REPLACE로 처리한다.
function isSameType(oldNode, newNode) {
  if (!oldNode || !newNode) return false;
  if (oldNode.type !== newNode.type) return false;
  if (oldNode.type === 'text') return true;
  return oldNode.tag === newNode.tag;
}

// 현재 pair가 MOVE patch 대상인지 판단한다.
// key가 같은 노드가 old/new 양쪽에 모두 존재하고 위치만 달라질 때만 MOVE로 기록해야 중복 patch 생성을 줄일 수 있다.
function shouldCreateMovePatch(pair) {
  return (
    pair.key != null &&
    pair.oldChild != null &&
    pair.newChild != null &&
    pair.oldIndex != null &&
    pair.newIndex != null &&
    pair.oldIndex !== pair.newIndex
  );
}

// 자식 pair 목록에서 위치 이동이 발생한 노드를 찾아 MOVE patch를 추가한다.
// CREATE/REMOVE와 달리 같은 노드의 "위치만 변경"된 경우를 별도로 기록해야 keyed diff 의도를 더 분명하게 표현할 수 있다.
function appendMovePatches(pairs, path, patches) {
  for (const pair of pairs) {
    if (!shouldCreateMovePatch(pair)) continue;

    patches.push({
      type: PATCH_TYPE_MOVE,
      path: [...path, pair.oldIndex],
      to: pair.newIndex,
      key: pair.key,
    });
  }
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

  // 같은 key를 가진 노드의 위치가 바뀐 경우를 먼저 MOVE patch로 기록한다.
  // 이후 재귀 비교는 노드 내부 내용(TEXT/PROPS 등) 변경을 계속 추적하도록 그대로 유지한다.
  appendMovePatches(pairs, path, patches);

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
