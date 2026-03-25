import { createElementVNode, createTextVNode } from './vnode.js';

// 공백만 있는 text node는 화면 구조 비교에 도움이 되지 않으므로 제외한다.
// 이 규칙이 children 인덱스 기준이 되므로 Diff / Patch와 반드시 동일해야 한다.
function isIgnorableText(node) {
  return node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '';
}

// 실제 DOM element의 attribute를 plain object 형태로 수집한다.
function getElementProps(el) {
  const props = {};
  for (const attr of el.attributes) {
    props[attr.name] = attr.value;
  }
  return props;
}

export function domToVdom(node) {
  // null 입력은 더 이상 내려갈 노드가 없다는 뜻이므로 null로 종료한다.
  if (!node) return null;

  // 텍스트 노드는 가장 먼저 처리한다.
  // element의 children 안에서도 text는 별도 VNode로 유지해야 한다.
  if (node.nodeType === Node.TEXT_NODE) {
    return createTextVNode(node.textContent);
  }

  // 이 프로젝트에서는 element와 text만 VDOM으로 다룬다.
  // comment 같은 나머지 노드는 변환 대상에서 제외한다.
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const props = getElementProps(node);
  const children = [];

  // childNodes를 그대로 순회하되, 주석과 의미 없는 공백 text는 건너뛴다.
  // 여기서 남은 children 순서가 이후 path 계산의 기준이 된다.
  for (const child of node.childNodes) {
    if (child.nodeType === Node.COMMENT_NODE || isIgnorableText(child)) continue;
    const vChild = domToVdom(child);
    if (vChild) children.push(vChild);
  }

  // tagName은 브라우저에서 대문자로 들어올 수 있으므로 소문자로 통일한다.
  return createElementVNode(node.tagName.toLowerCase(), props, children);
}
