import { PATCH_TYPES } from './patchTypes.js';
import { diffProps } from './diffProps.js';
import { collectChildPairs } from './diffChildren.js';

function isSameType(oldNode, newNode) {
  if (!oldNode || !newNode) return false;
  if (oldNode.type !== newNode.type) return false;
  if (oldNode.type === 'text') return true;
  return oldNode.tag === newNode.tag;
}

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
  for (const { oldChild, newChild, index } of pairs) {
    walk(oldChild, newChild, [...path, index], patches);
  }
}

export function diff(oldTree, newTree) {
  const patches = [];
  walk(oldTree, newTree, [], patches);
  return patches;
}
