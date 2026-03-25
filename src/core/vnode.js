export function createElementVNode(tag, props = {}, children = []) {
  const key = props.key ?? props['data-key'] ?? null;
  return {
    type: 'element',
    tag,
    props,
    key,
    children,
  };
}

export function createTextVNode(text) {
  return {
    type: 'text',
    text,
  };
}

export function isVNode(value) {
  return Boolean(value && (value.type === 'element' || value.type === 'text'));
}
