// VDOM의 props를 실제 DOM attribute로 옮긴다.
// 현재 단계에서는 이벤트나 특수 속성 처리 없이 단순 attribute 반영만 담당한다.
function setProps(el, props = {}) {
  for (const [name, value] of Object.entries(props)) {
    el.setAttribute(name, value);
  }
}

export function renderVdom(vnode) {
  // null VDOM이 들어오면 빈 텍스트 노드로 처리해 호출부가 안전하게 이어지게 한다.
  if (!vnode) return document.createTextNode('');

  // text VNode는 실제 Text node로 바로 변환한다.
  if (vnode.type === 'text') {
    return document.createTextNode(vnode.text);
  }

  // element VNode는 태그 생성 -> props 적용 -> 자식 재귀 렌더 순서로 복원한다.
  const el = document.createElement(vnode.tag);
  setProps(el, vnode.props);

  for (const child of vnode.children) {
    el.appendChild(renderVdom(child));
  }

  return el;
}

// container 내부를 현재 VDOM 결과로 통째로 교체한다.
// 초기 렌더나 history 복원처럼 "현재 트리 전체를 다시 그릴 때" 사용한다.
export function mountVdom(container, vnode) {
  container.replaceChildren(renderVdom(vnode));
}
