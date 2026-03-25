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

// patch 팀 계약에 맞춰 diff 단계에서도 같은 phase 순서를 공유한다.
// 같은 부모에서 CREATE/REMOVE/MOVE가 섞여도 예측 가능한 순서로 patch를 만들기 위해 사용한다.
function getPatchPhase(type) {
  switch (type) {
    case PATCH_TYPES.REMOVE:
      return 0;
    case PATCH_TYPES.CREATE:
      return 1;
    case PATCH_TYPE_MOVE:
      return 2;
    case PATCH_TYPES.REPLACE:
      return 3;
    case PATCH_TYPES.TEXT:
      return 4;
    case PATCH_TYPES.PROPS:
      return 5;
    default:
      return 6;
  }
}

// 현재 patch가 지금 부모의 "직계 자식" patch인지 확인한다.
// 같은 부모에서 섞이는 구조 변경 patch만 먼저 정렬해야 patch 계약을 깨지 않고 출력할 수 있다.
function isDirectChildPatch(parentPath, patchPath) {
  if (patchPath.length !== parentPath.length + 1) return false;
  return parentPath.every((value, index) => value === patchPath[index]);
}

// 같은 부모 아래 direct child patch의 순서를 정한다.
// REMOVE -> CREATE -> MOVE -> REPLACE -> TEXT -> PROPS 순서를 맞추고, 같은 phase 안에서는 index 안정성을 유지한다.
function compareSiblingPatchOrder(patchA, patchB) {
  const phaseDiff = getPatchPhase(patchA.type) - getPatchPhase(patchB.type);
  if (phaseDiff !== 0) return phaseDiff;

  const indexA = patchA.path[patchA.path.length - 1] ?? -1;
  const indexB = patchB.path[patchB.path.length - 1] ?? -1;

  if (patchA.type === PATCH_TYPES.REMOVE) {
    return indexB - indexA;
  }

  if (patchA.type === PATCH_TYPES.CREATE) {
    return indexA - indexB;
  }

  if (patchA.type === PATCH_TYPE_MOVE) {
    const toA = Number.isFinite(patchA.to) ? patchA.to : Number.MAX_SAFE_INTEGER;
    const toB = Number.isFinite(patchB.to) ? patchB.to : Number.MAX_SAFE_INTEGER;
    if (toA !== toB) return toA - toB;
  }

  return indexB - indexA;
}

// pair 정보로 MOVE patch를 만든다.
// MOVE.path는 기존 위치(oldIndex), MOVE.to는 새 위치(newIndex)라는 계약을 diff 단계에서 명확하게 고정한다.
function createMovePatch(path, pair) {
  return {
    type: PATCH_TYPE_MOVE,
    path: [...path, pair.oldIndex],
    to: Number(pair.newIndex),
    key: pair.key,
  };
}

// 자식 비교에서 나온 patch를 현재 부모 기준으로 정리해 patches에 추가한다.
// direct child patch는 phase 순서로 정렬하고, 더 깊은 하위 patch는 재귀 결과를 그대로 뒤에 붙인다.
function appendOrderedChildPatches(path, childPatches, patches) {
  const directChildPatches = [];
  const nestedPatches = [];

  for (const patch of childPatches) {
    if (isDirectChildPatch(path, patch.path)) {
      directChildPatches.push(patch);
      continue;
    }

    nestedPatches.push(patch);
  }

  directChildPatches.sort(compareSiblingPatchOrder);
  patches.push(...directChildPatches, ...nestedPatches);
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
  const childPatches = [];

  for (const pair of pairs) {
    if (shouldCreateMovePatch(pair)) {
      childPatches.push(createMovePatch(path, pair));
    }

    // 현재 pair 계약에서는 pathIndex를 항상 제공하므로, 재귀 path 계산도 그 값을 그대로 사용한다.
    // 예전 index fallback을 제거해 diffChildren/keyedDiff와의 계약을 더 명확하게 맞춘다.
    walk(pair.oldChild, pair.newChild, [...path, pair.pathIndex], childPatches);
  }

  appendOrderedChildPatches(path, childPatches, patches);
}

// 외부에서는 이전 트리와 다음 트리만 넘기면 되도록 diff 진입점을 단순하게 유지한다.
// 내부 재귀 구현을 감춘 채 patch 배열만 반환하면 호출부가 알고리즘 세부사항에 의존하지 않아도 된다.
export function diff(oldTree, newTree) {
  const patches = [];
  walk(oldTree, newTree, [], patches);
  return patches;
}
