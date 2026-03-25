import { renderVdom } from '../core/renderVdom.js';
import { PATCH_TYPES } from '../diff/patchTypes.js';
import { getChildNodesForPath, getNodeByPath } from './domOps.js';

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
  if (patch.path.length === 0) {
    if (patch.type === PATCH_TYPES.REPLACE || patch.type === PATCH_TYPES.CREATE) {
      return renderVdom(patch.node);
    }
    if (patch.type === PATCH_TYPES.TEXT && root.nodeType === Node.TEXT_NODE) {
      root.textContent = patch.text;
    }
    if (patch.type === PATCH_TYPES.PROPS) {
      applyPropsPatch(root, patch.props);
    }
    if (patch.type === PATCH_TYPES.REMOVE) {
      return document.createTextNode('');
    }
    return root;
  }

  const parentPath = patch.path.slice(0, -1);
  const targetIndex = patch.path[patch.path.length - 1];
  const parent = getNodeByPath(root, parentPath);
  if (!parent) return root;

  const target = getChildNodesForPath(parent)[targetIndex] ?? null;

  switch (patch.type) {
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
    case PATCH_TYPES.PROPS:
      applyPropsPatch(target, patch.props);
      break;
    default:
      break;
  }

  return root;
}

export function applyPatches(rootNode, patches = []) {
  const ordered = [...patches].sort((a, b) => b.path.length - a.path.length);
  let currentRoot = rootNode;

  for (const patch of ordered) {
    currentRoot = applySinglePatch(currentRoot, patch);
  }

  return currentRoot;
}
