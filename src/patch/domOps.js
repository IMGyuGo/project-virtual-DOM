function isMeaningfulTextNode(node) {
  // path 계산 대상에서 공백 텍스트를 제외하기 위해 의미 있는 텍스트만 통과시킨다.
  // (DOM 파서/편집 과정에서 생기는 줄바꿈 공백 노드가 인덱스를 오염시키지 않게 함)
  return node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '';
}

export function getChildNodesForPath(node) {
  // path 인덱싱 기준 child 목록:
  // - element 노드
  // - 공백이 아닌 text 노드
  // comment/공백 text는 제외하여 diff 쪽 path 규칙과 맞춘다.
  return Array.from(node.childNodes).filter(
    (child) => child.nodeType === Node.ELEMENT_NODE || isMeaningfulTextNode(child)
  );
}

export function getNodeByPath(root, path = []) {
  // 루트부터 path를 순차 탐색해 대상 노드를 찾는다.
  // 중간에 경로가 끊기면 null을 반환해 호출부에서 안전하게 skip할 수 있게 한다.
  let current = root;

  for (const idx of path) {
    if (!current) return null;
    const children = getChildNodesForPath(current);
    current = children[idx] ?? null;
  }

  return current;
}
