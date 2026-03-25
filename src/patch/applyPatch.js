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

function replaceNode(target, vnode) {
  // REPLACE는 대상 노드를 통째로 새 vnode 렌더 결과로 교체한다.
  const newNode = renderVdom(vnode);
  target.replaceWith(newNode);
  return newNode;
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
  // 1) 더 깊은 노드 patch를 먼저 적용
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
    default:
      break;
  }

  return root;
}

export function applyPatches(rootNode, patches = []) {
  // 2단계 적용 순서 안정화:
  // 1) 깊은 경로를 먼저 적용
  // 2) 같은 부모의 형제 노드는 큰 인덱스부터 적용
  // 3) 나머지는 경로 역순으로 결정적 정렬
  const ordered = [...patches].sort(comparePatchOrder);
  let currentRoot = rootNode;

  // patch마다 대상 노드를 그때그때 다시 조회해 적용한다.
  // (이전 patch가 DOM 구조를 바꿨을 수 있으므로 캐시 참조를 재사용하지 않는다.)
  for (const patch of ordered) {
    currentRoot = applySinglePatch(currentRoot, patch);
  }

  return currentRoot;
}
