let lastAfterTree = null;
let tick = 0;

function cloneValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function isPrimitive(value) {
  return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

function primitiveText(value) {
  if (typeof value === 'string') return `"${value}"`;
  if (value === null) return 'null';
  return String(value);
}

function createRow(key, text, valueClass = '') {
  const row = document.createElement('div');
  row.className = 'json-row';

  if (key !== null) {
    const keyEl = document.createElement('span');
    keyEl.className = 'json-key';
    keyEl.textContent = `${key}: `;
    row.appendChild(keyEl);
  }

  const valueEl = document.createElement('span');
  valueEl.className = valueClass ? `json-value ${valueClass}` : 'json-value';
  valueEl.textContent = text;
  row.appendChild(valueEl);
  return row;
}

function walkTree(key, value) {
  const li = document.createElement('li');

  if (isPrimitive(value)) {
    const valueClass =
      value === null ? 'null' : typeof value === 'string' ? 'string' : typeof value === 'number' ? 'number' : 'boolean';
    li.appendChild(createRow(key, primitiveText(value), valueClass));
    return li;
  }

  const isArray = Array.isArray(value);
  const keys = isArray ? value.map((_, index) => index) : Object.keys(value);
  const shape = isArray ? `Array(${value.length})` : `Object(${keys.length})`;
  li.appendChild(createRow(key, shape, 'shape'));

  const ul = document.createElement('ul');
  ul.className = 'json-branch';

  for (const childKey of keys) {
    ul.appendChild(walkTree(String(childKey), value[childKey]));
  }

  li.appendChild(ul);
  return li;
}

function renderPrettyTree(el, value) {
  if (!el) return;
  const root = document.createElement('div');
  root.className = 'json-tree';

  const ul = document.createElement('ul');
  ul.className = 'json-branch root';
  ul.appendChild(walkTree(null, value));
  root.appendChild(ul);

  el.replaceChildren(root);
}

function pathText(path = []) {
  return `[${path.join(', ')}]`;
}

function patchText(patch) {
  if (!patch || typeof patch !== 'object') return String(patch);
  const path = pathText(patch.path || []);
  if (patch.type === 'TEXT') return `TEXT @ ${path} => ${patch.text ?? ''}`;
  if (patch.type === 'PROPS') return `PROPS @ ${path} => ${JSON.stringify(patch.props ?? {})}`;
  if (patch.type === 'REPLACE') return `REPLACE @ ${path}`;
  if (patch.type === 'CREATE') return `CREATE @ ${path}`;
  if (patch.type === 'REMOVE') return `REMOVE @ ${path}`;
  return `${patch.type || 'UNKNOWN'} @ ${path}`;
}

function normalizePatches(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function meaningfulChildren(node) {
  return Array.from(node.childNodes).filter((child) => {
    if (child.nodeType === Node.COMMENT_NODE) return false;
    if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() === '') return false;
    return true;
  });
}

function nodeAtPath(rootNode, path = []) {
  let current = rootNode;
  for (const index of path) {
    if (!current) return null;
    const children = meaningfulChildren(current);
    current = children[index] ?? null;
  }
  return current;
}

function flashNode(node, className) {
  if (!node) return;

  let target = node;
  if (node.nodeType === Node.TEXT_NODE) {
    target = node.parentElement;
  }
  if (!(target instanceof Element)) return;

  target.classList.remove(className);
  void target.offsetWidth;
  target.classList.add(className);
}

function highlightPatchTargets(patches) {
  const roots = [
    document.querySelector('#actual-root')?.firstElementChild,
    document.querySelector('#test-root')?.firstElementChild,
  ].filter(Boolean);

  for (const patch of patches) {
    const dotPath = (patch.path || []).join('.');
    const graphNode = document.querySelector(`.graph-node[data-path="${dotPath}"]`);
    flashNode(graphNode, 'graph-hit');

    for (const root of roots) {
      const node = nodeAtPath(root, patch.path || []);
      flashNode(node, 'patch-hit');
    }
  }
}

function renderPatchLog(patches) {
  const log = document.querySelector('#patch-log');
  if (!log) return;

  if (patches.length === 0) {
    const row = document.createElement('p');
    row.className = 'log-row muted';
    row.textContent = '변경 사항이 없습니다.';
    log.replaceChildren(row);
    return;
  }

  const rows = patches.slice(0, 18).map((patch) => {
    tick += 1;
    const row = document.createElement('p');
    row.className = 'log-row';
    row.textContent = `${String(tick).padStart(2, '0')}. ${patchText(patch)}`;
    return row;
  });

  log.replaceChildren(...rows);
}

function vnodeLabel(node) {
  if (!node) return 'null';
  if (node.type === 'text') {
    const text = String(node.text ?? '').slice(0, 16);
    return `"${text}"`;
  }
  return `<${node.tag}>`;
}

function buildVdomGraph(node, path = []) {
  const li = document.createElement('li');
  li.className = 'graph-item';

  const marker = document.createElement('span');
  marker.className = 'graph-node';
  marker.setAttribute('data-path', path.join('.'));
  marker.textContent = vnodeLabel(node);
  li.appendChild(marker);

  if (node && node.type === 'element' && Array.isArray(node.children) && node.children.length > 0) {
    const children = document.createElement('ul');
    children.className = 'graph-branch';

    node.children.forEach((child, index) => {
      children.appendChild(buildVdomGraph(child, [...path, index]));
    });

    li.appendChild(children);
  }

  return li;
}

function renderTreeGraph(vdomTree) {
  const graph = document.querySelector('#tree-graph');
  if (!graph) return;

  if (!vdomTree) {
    graph.textContent = '트리 데이터 없음';
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'graph-tree';
  const ul = document.createElement('ul');
  ul.className = 'graph-branch';
  ul.appendChild(buildVdomGraph(vdomTree, []));
  wrapper.appendChild(ul);
  graph.replaceChildren(wrapper);
}

export function renderJson(el, value) {
  if (!el) return;

  if (el.id === 'json-current') {
    const after = cloneValue(value);
    const before = lastAfterTree ? cloneValue(lastAfterTree) : cloneValue(after);
    lastAfterTree = cloneValue(after);

    renderPrettyTree(el, before);
    renderPrettyTree(document.querySelector('#json-after'), after);
    renderTreeGraph(after);
    return;
  }

  if (el.id === 'json-diff') {
    const patches = normalizePatches(value);
    const pretty = patches.map((patch) => ({
      type: patch.type,
      path: patch.path,
      detail: patch.type === 'TEXT' ? patch.text : patch.type === 'PROPS' ? patch.props : patch.node ?? null,
    }));

    renderPrettyTree(el, pretty);
    renderPatchLog(patches);
    highlightPatchTargets(patches);
    return;
  }

  renderPrettyTree(el, value);
}
