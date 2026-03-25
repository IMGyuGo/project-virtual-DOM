export function renderJson(el, value) {
  el.textContent = JSON.stringify(value, null, 2);
}
