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
  if (!target || target.nodeType !== Node.ELEMENT_NODE) return;

  for (const key of propsPatch.remove) {
    target.removeAttribute(key);
  }

  for (const [key, value] of Object.entries(propsPatch.set)) {
    target.setAttribute(key, value);
  }
}

function replaceNode(target, vnode) {
  const newNode = renderVdom(vnode);
  target.replaceWith(newNode);
  return newNode;
}

function getParentPath(path = []) {
  return path.slice(0, -1);
}

function getTargetIndex(path = []) {
  if (path.length === 0) return -1;
  return path[path.length - 1];
}

function isSameParentPath(pathA = [], pathB = []) {
  const parentA = getParentPath(pathA);
  const parentB = getParentPath(pathB);

  if (parentA.length !== parentB.length) return false;
  return parentA.every((value, index) => value === parentB[index]);
}

function comparePathDesc(pathA = [], pathB = []) {
  const maxLen = Math.max(pathA.length, pathB.length);

  for (let i = 0; i < maxLen; i += 1) {
    const a = pathA[i] ?? -1;
    const b = pathB[i] ?? -1;
    if (a !== b) return b - a;
  }

  return 0;
}

function comparePatchOrder(patchA, patchB) {
  const depthDiff = patchB.path.length - patchA.path.length;
  if (depthDiff !== 0) return depthDiff;

  // 같은 부모 아래의 형제 패치는 인덱스 큰 것부터 적용한다.
  // REMOVE/REPLACE가 섞일 때 앞 인덱스를 먼저 건드리면 뒤 인덱스가 밀릴 수 있다.
  if (isSameParentPath(patchA.path, patchB.path)) {
    return getTargetIndex(patchB.path) - getTargetIndex(patchA.path);
  }

  // 나머지는 경로 역순으로 고정해 실행 순서를 결정적으로 유지한다.
  return comparePathDesc(patchA.path, patchB.path);
}

function applySinglePatch(root, patch) {
  const patchType = normalizePatchType(patch.type);

  // path=[] 는 루트 노드 자체를 대상으로 하는 패치다.
  // 예: { type: REPLACE, path: [], node: ... } 는 루트 전체 교체.
  if (patch.path.length === 0) {
    if (patchType === PATCH_TYPES.REPLACE || patchType === PATCH_TYPES.CREATE) {
      return renderVdom(patch.node);
    }
    if (patchType === PATCH_TYPES.TEXT && root.nodeType === Node.TEXT_NODE) {
      root.textContent = patch.text;
    }
    if (patchType === PATCH_TYPE_UPDATE_PROPS) {
      applyPropsPatch(root, patch.props);
    }
    if (patchType === PATCH_TYPES.REMOVE) {
      return document.createTextNode('');
    }
    return root;
  }

  const parentPath = patch.path.slice(0, -1);
  const targetIndex = patch.path[patch.path.length - 1];
  // 비루트 패치 해석 규칙:
  // - parentPath: 부모 노드 경로
  // - targetIndex: 부모 기준 자식 인덱스
  const parent = getNodeByPath(root, parentPath);
  if (!parent) return root;

  const target = getChildNodesForPath(parent)[targetIndex] ?? null;

  switch (patchType) {
    case PATCH_TYPES.CREATE: {
      const newNode = renderVdom(patch.node);
      const children = getChildNodesForPath(parent);
      const anchor = children[targetIndex] ?? null;
      parent.insertBefore(newNode, anchor);
      break;
    }
    case PATCH_TYPES.REMOVE:
      if (target) target.remove();
      break;
    case PATCH_TYPES.REPLACE:
      if (target) replaceNode(target, patch.node);
      break;
    case PATCH_TYPES.TEXT:
      if (target && target.nodeType === Node.TEXT_NODE) {
        target.textContent = patch.text;
      }
      break;
    case PATCH_TYPE_UPDATE_PROPS:
      applyPropsPatch(target, patch.props);
      break;
    default:
      break;
  }

  return root;
}

export function applyPatches(rootNode, patches = []) {
  // 2단계 적용 순서 안정화:
  // 1) 깊은 경로를 먼저 적용
  // 2) 같은 부모의 형제 노드는 큰 인덱스부터 적용
  const ordered = [...patches].sort(comparePatchOrder);
  let currentRoot = rootNode;

  for (const patch of ordered) {
    currentRoot = applySinglePatch(currentRoot, patch);
  }

  return currentRoot;
}
