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
  // REMOVE/REPLACE가 섞일 때 인덱스 밀림 부작용을 줄이기 위해
  // 더 깊은 경로(path 길이 큰 것)부터 먼저 적용한다.
  const ordered = [...patches].sort((a, b) => b.path.length - a.path.length);
  let currentRoot = rootNode;

  for (const patch of ordered) {
    currentRoot = applySinglePatch(currentRoot, patch);
  }

  return currentRoot;
}
