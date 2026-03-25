import { createElementVNode, createTextVNode } from './vnode.js';

function isIgnorableText(node) {
  return node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '';
}

function getElementProps(el) {
  const props = {};
  for (const attr of el.attributes) {
    props[attr.name] = attr.value;
  }
  return props;
}

export function domToVdom(node) {
  if (!node) return null;

  if (node.nodeType === Node.TEXT_NODE) {
    return createTextVNode(node.textContent);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const props = getElementProps(node);
  const children = [];

  for (const child of node.childNodes) {
    if (child.nodeType === Node.COMMENT_NODE || isIgnorableText(child)) continue;
    const vChild = domToVdom(child);
    if (vChild) children.push(vChild);
  }

  return createElementVNode(node.tagName.toLowerCase(), props, children);
}
