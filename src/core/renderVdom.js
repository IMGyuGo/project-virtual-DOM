function setProps(el, props = {}) {
  for (const [name, value] of Object.entries(props)) {
    el.setAttribute(name, value);
  }
}

export function renderVdom(vnode) {
  if (!vnode) return document.createTextNode('');

  if (vnode.type === 'text') {
    return document.createTextNode(vnode.text);
  }

  const el = document.createElement(vnode.tag);
  setProps(el, vnode.props);

  for (const child of vnode.children) {
    el.appendChild(renderVdom(child));
  }

  return el;
}

export function mountVdom(container, vnode) {
  container.replaceChildren(renderVdom(vnode));
}
