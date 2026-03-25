function isMeaningfulTextNode(node) {
  return node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '';
}

export function getChildNodesForPath(node) {
  return Array.from(node.childNodes).filter(
    (child) => child.nodeType === Node.ELEMENT_NODE || isMeaningfulTextNode(child)
  );
}

export function getNodeByPath(root, path = []) {
  let current = root;

  for (const idx of path) {
    if (!current) return null;
    const children = getChildNodesForPath(current);
    current = children[idx] ?? null;
  }

  return current;
}
