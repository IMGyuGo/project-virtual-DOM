import { renderVdom } from '../core/renderVdom.js';
import { PATCH_TYPES } from '../diff/patchTypes.js';
import { getChildNodesForPath, getNodeByPath } from './domOps.js';

// 팀 Patch 계약:
// - 표준 props 패치 타입은 UPDATE_PROPS
// - Diff 쪽 레거시 출력은 PROPS일 수 있음
// Patch 엔진에서 둘을 같은 의미로 정규화해서 처리한다.
const PATCH_TYPE_UPDATE_PROPS = 'UPDATE_PROPS';

function normalizePatchType(type) {
  // 팀 간 호환을 위한 계약 브릿지.
  // Diff가 구표기(PROPS)를 보내도 C(Patch/State)에서 동일하게 해석한다.
  if (type === PATCH_TYPES.PROPS) return PATCH_TYPE_UPDATE_PROPS;
  return type;
}

function applyPropsPatch(target, propsPatch) {
  // props patch는 element 노드에만 적용한다.
  // text/comment 노드에는 attribute 개념이 없으므로 무시한다.
  if (!target || target.nodeType !== Node.ELEMENT_NODE) return;

  // remove 목록은 명시적으로 속성을 제거한다.
  for (const key of propsPatch.remove) {
    target.removeAttribute(key);
  }

  // set 목록은 최종 값으로 덮어쓴다.
  for (const [key, value] of Object.entries(propsPatch.set)) {
    target.setAttribute(key, value);
  }
}

function getElementKey(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
  return node.getAttribute('data-key') ?? node.getAttribute('key');
}

function findMoveTarget(parent, patch, fallbackIndex) {
  if (patch.key != null) {
    const wantedKey = String(patch.key);
    const byKey = getChildNodesForPath(parent).find((child) => String(getElementKey(child)) === wantedKey);
    if (byKey) return byKey;
  }

  return getChildNodesForPath(parent)[fallbackIndex] ?? null;
}

function moveChild(parent, target, toIndex) {
  if (!parent || !target) return;

  const children = getChildNodesForPath(parent).filter((child) => child !== target);
  const safeIndex = Math.max(0, Math.min(toIndex, children.length));
  const anchor = children[safeIndex] ?? null;
  parent.insertBefore(target, anchor);
}

function replaceNode(target, vnode) {
  // REPLACE는 대상 노드를 통째로 새 vnode 렌더 결과로 교체한다.
  const newNode = renderVdom(vnode);
  target.replaceWith(newNode);
  return newNode;
}

function getPatchPhase(type) {
  // 구조를 바꾸는 patch를 먼저 적용하고, 내용 갱신 patch를 나중에 적용한다.
  // 순서:
  // REMOVE -> CREATE -> MOVE -> REPLACE -> TEXT -> UPDATE_PROPS
  switch (type) {
    case PATCH_TYPES.REMOVE:
      return 0;
    case PATCH_TYPES.CREATE:
      return 1;
    case PATCH_TYPES.MOVE:
      return 2;
    case PATCH_TYPES.REPLACE:
      return 3;
    case PATCH_TYPES.TEXT:
      return 4;
    case PATCH_TYPE_UPDATE_PROPS:
      return 5;
    default:
      return 6;
  }
}

function getMoveToIndex(patch) {
  const parsed = Number.parseInt(patch.to, 10);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function getDomNodeKey(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
  return node.getAttribute('key') ?? node.getAttribute('data-key');
}

function resolveMoveFromIndex(children, fallbackFromIndex, patchKey) {
  if (patchKey == null) return fallbackFromIndex;
  const key = String(patchKey);
  const foundIndex = children.findIndex((child) => getDomNodeKey(child) === key);
  if (foundIndex !== -1) return foundIndex;
  return fallbackFromIndex;
}

function applyMovePatch(parent, fallbackFromIndex, patch) {
  const toIndex = getMoveToIndex(patch);
  if (toIndex == null) return;

  const children = getChildNodesForPath(parent);
  const fromIndex = resolveMoveFromIndex(children, fallbackFromIndex, patch.key);

  if (fromIndex < 0 || fromIndex >= children.length) return;

  const movingNode = children[fromIndex];
  if (!movingNode) return;

  // insertBefore는 기존 노드를 전달하면 자동으로 "이동" 처리한다.
  // 목표 인덱스를 정확히 맞추기 위해 먼저 분리한 뒤 재삽입한다.
  parent.removeChild(movingNode);

  const childrenAfterRemove = getChildNodesForPath(parent);
  const boundedTo = Math.max(0, Math.min(toIndex, childrenAfterRemove.length));
  const anchor = childrenAfterRemove[boundedTo] ?? null;
  parent.insertBefore(movingNode, anchor);
}

function getParentPath(path = []) {
  // 마지막 인덱스를 제외한 경로는 부모 노드 경로다.
  return path.slice(0, -1);
}

function getTargetIndex(path = []) {
  // 빈 경로는 루트를 의미하므로 자식 인덱스가 없다.
  if (path.length === 0) return -1;
  return path[path.length - 1];
}

function isSameParentPath(pathA = [], pathB = []) {
  // 두 patch가 같은 부모 아래 형제인지 판별한다.
  const parentA = getParentPath(pathA);
  const parentB = getParentPath(pathB);

  if (parentA.length !== parentB.length) return false;
  return parentA.every((value, index) => value === parentB[index]);
}

function comparePathDesc(pathA = [], pathB = []) {
  // 같은 depth에서 경로를 역순 비교해 정렬 결과를 결정적으로 만든다.
  // (실행 환경에 따라 sort 결과가 흔들리지 않도록 고정)
  const maxLen = Math.max(pathA.length, pathB.length);

  for (let i = 0; i < maxLen; i += 1) {
    const a = pathA[i] ?? -1;
    const b = pathB[i] ?? -1;
    if (a !== b) return b - a;
  }

  return 0;
}

function comparePatchOrder(patchA, patchB) {
  const typeA = normalizePatchType(patchA.type);
  const typeB = normalizePatchType(patchB.type);

  // 1) 더 깊은 노드 patch를 먼저 적용
  const depthDiff = patchB.path.length - patchA.path.length;
  if (depthDiff !== 0) return depthDiff;

  // 같은 부모 아래에서는 patch 단계(구조 -> 내용) 우선순위를 먼저 맞춘다.
  if (isSameParentPath(patchA.path, patchB.path)) {
    const phaseDiff = getPatchPhase(typeA) - getPatchPhase(typeB);
    if (phaseDiff !== 0) return phaseDiff;

    // 같은 단계 내부에서는 타입별로 인덱스 정렬 기준을 다르게 둔다.
    // REMOVE: 큰 인덱스부터(인덱스 밀림 방지)
    if (typeA === PATCH_TYPES.REMOVE) {
      return getTargetIndex(patchB.path) - getTargetIndex(patchA.path);
    }

    // CREATE: 작은 인덱스부터(목표 위치 기준으로 앞에서부터 채움)
    if (typeA === PATCH_TYPES.CREATE) {
      return getTargetIndex(patchA.path) - getTargetIndex(patchB.path);
    }

    // MOVE: 목표 인덱스(to) 작은 것부터
    if (typeA === PATCH_TYPES.MOVE) {
      const moveToA = getMoveToIndex(patchA) ?? Number.MAX_SAFE_INTEGER;
      const moveToB = getMoveToIndex(patchB) ?? Number.MAX_SAFE_INTEGER;
      if (moveToA !== moveToB) return moveToA - moveToB;
    }

    // 그 외(TEXT/REPLACE/UPDATE_PROPS)는 기존처럼 큰 인덱스부터 적용.
    return getTargetIndex(patchB.path) - getTargetIndex(patchA.path);
  }

  // 부모가 다르면 경로 역순으로 고정해 실행 순서를 유지한다.
  return comparePathDesc(patchA.path, patchB.path);
}

function applySinglePatch(root, patch) {
  // patch 계약 표기를 먼저 정규화해 switch 분기를 단순화한다.
  const patchType = normalizePatchType(patch.type);

  // path=[] 는 루트 노드 자체를 대상으로 하는 패치다.
  // 예: { type: REPLACE, path: [], node: ... } 는 루트 전체 교체.
  if (patch.path.length === 0) {
    // 루트 CREATE/REPLACE는 "새 루트 노드 반환"으로 처리한다.
    if (patchType === PATCH_TYPES.REPLACE || patchType === PATCH_TYPES.CREATE) {
      return renderVdom(patch.node);
    }
    // 루트 TEXT는 루트가 텍스트 노드일 때만 반영한다.
    if (patchType === PATCH_TYPES.TEXT && root.nodeType === Node.TEXT_NODE) {
      root.textContent = patch.text;
    }
    // 루트 UPDATE_PROPS는 루트 element의 속성만 부분 갱신한다.
    if (patchType === PATCH_TYPE_UPDATE_PROPS) {
      applyPropsPatch(root, patch.props);
    }
    // 루트 REMOVE는 빈 텍스트 노드로 대체해 호출부 참조를 유지한다.
    if (patchType === PATCH_TYPES.REMOVE) {
      return document.createTextNode('');
    }
    return root;
  }

  const parentPath = patch.path.slice(0, -1);
  const targetIndex = patch.path[patch.path.length - 1];
  const parent = getNodeByPath(root, parentPath);
  // 부모를 못 찾으면 (이미 이전 patch에서 구조가 바뀐 경우 등) 안전하게 skip한다.
  if (!parent) return root;

  const target = getChildNodesForPath(parent)[targetIndex] ?? null;

  switch (patchType) {
    case PATCH_TYPES.CREATE: {
      // CREATE는 parent의 targetIndex 앞(anchor)에 삽입한다.
      // anchor가 없으면 append와 동일하게 끝에 붙는다.
      const newNode = renderVdom(patch.node);
      const children = getChildNodesForPath(parent);
      const anchor = children[targetIndex] ?? null;
      parent.insertBefore(newNode, anchor);
      break;
    }
    case PATCH_TYPES.REMOVE:
      // REMOVE는 현재 시점 target이 있을 때만 제거한다.
      if (target) target.remove();
      break;
    case PATCH_TYPES.REPLACE:
      // REPLACE는 현재 시점 target을 새 vnode로 교체한다.
      if (target) replaceNode(target, patch.node);
      break;
    case PATCH_TYPES.MOVE:
      // MOVE는 기존 위치(path)에서 목표 위치(to)로 같은 노드를 재배치한다.
      // key가 있으면 key로 현재 위치를 다시 찾아 인덱스 변경 영향을 줄인다.
      applyMovePatch(parent, targetIndex, patch);
      break;
    case PATCH_TYPES.TEXT:
      // TEXT는 텍스트 노드에만 적용한다.
      if (target && target.nodeType === Node.TEXT_NODE) {
        target.textContent = patch.text;
      }
      break;
    case PATCH_TYPE_UPDATE_PROPS:
      // UPDATE_PROPS는 target element 속성만 부분 변경한다.
      applyPropsPatch(target, patch.props);
      break;
    case PATCH_TYPES.MOVE: {
      // MOVE는 key(있다면 key 우선)로 기존 DOM 노드를 찾아 새 인덱스로 이동한다.
      const moveTarget = findMoveTarget(parent, patch, targetIndex);
      if (moveTarget && Number.isInteger(patch.to)) {
        moveChild(parent, moveTarget, patch.to);
      }
      break;
    }
    default:
      break;
  }

  return root;
}

export function applyPatches(rootNode, patches = []) {
  // 2단계 적용 순서 안정화:
  // 1) 깊은 경로를 먼저 적용
  // 2) 같은 부모에서는 patch 단계 우선순위(REMOVE -> CREATE -> MOVE -> 내용 갱신)를 적용
  // 3) 같은 단계 내부는 타입별 정렬 기준(인덱스/목표 인덱스)을 적용
  // 4) 나머지는 경로 역순으로 결정적 정렬
  const ordered = [...patches].sort(comparePatchOrder);
  let currentRoot = rootNode;

  // patch마다 대상 노드를 그때그때 다시 조회해 적용한다.
  // (이전 patch가 DOM 구조를 바꿨을 수 있으므로 캐시 참조를 재사용하지 않는다.)
  for (const patch of ordered) {
    currentRoot = applySinglePatch(currentRoot, patch);
  }

  return currentRoot;
}
