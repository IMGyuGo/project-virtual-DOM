let lastAfterTree = null;
let tick = 0;

// 객체/배열을 안전하게 복사해서 렌더용 데이터로 쓴다.
function cloneValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

// 값이 더 이상 내려갈 하위 구조가 없는지(문자/숫자/불리언/null) 판단
function isPrimitive(value) {
  return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

// 원시값을 화면에 보기 좋게 문자열로 바꾼다.
function primitiveText(value) {
  if (typeof value === 'string') return `"${value}"`;
  if (value === null) return 'null';
  return String(value);
}

// JSON 트리 한 줄(row) UI 생성
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

// 객체/배열을 재귀로 순회해서 트리 구조 <li>를 만든다.
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

// 특정 DOM 요소 안에 "예쁘게 정리된 JSON 트리"를 렌더링
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

// path 배열([1,0,2])을 읽기 쉬운 문자열로 바꾸는 헬퍼
function pathText(path = []) {
  return `[${path.join(', ')}]`;
}

// patch 1개를 사람이 읽기 쉬운 로그 문장으로 변환
function patchText(patch) {
  if (!patch || typeof patch !== 'object') return String(patch);
  const path = pathText(patch.path || []);
  if (patch.type === 'TEXT') return `TEXT @ ${path} => ${patch.text ?? ''}`;
  if (patch.type === 'PROPS') return `PROPS @ ${path} => ${JSON.stringify(patch.props ?? {})}`;
  if (patch.type === 'REPLACE') return `REPLACE @ ${path}`;
  if (patch.type === 'CREATE') return `CREATE @ ${path}`;
  if (patch.type === 'REMOVE') return `REMOVE @ ${path}`;
  if (patch.type === 'MOVE') return `MOVE @ ${path} => to:${patch.to} key:${patch.key ?? '-'}`;
  return `${patch.type || 'UNKNOWN'} @ ${path}`;
}

// 입력이 단일 patch여도 항상 배열처럼 다루기 위한 정규화
function normalizePatches(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

// 공백 텍스트/주석 노드는 제외하고 "의미 있는 자식 노드"만 반환
function meaningfulChildren(node) {
  return Array.from(node.childNodes).filter((child) => {
    if (child.nodeType === Node.COMMENT_NODE) return false;
    if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() === '') return false;
    return true;
  });
}

// path 기준으로 실제 DOM 노드를 찾아간다.
function nodeAtPath(rootNode, path = []) {
  let current = rootNode;
  for (const index of path) {
    if (!current) return null;
    const children = meaningfulChildren(current);
    current = children[index] ?? null;
  }
  return current;
}

// 하이라이트 애니메이션을 다시 재생시키기 위한 유틸
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

// diff 결과(path)를 기준으로
// 1) 트리 노드, 2) 실제/수정 영역 DOM 노드를 동시에 강조한다.
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

// Real-time Patch Log 패널 렌더링
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

const SVG_NS = 'http://www.w3.org/2000/svg';

// 0,1,2... 인덱스를 A,B,C... 라벨로 변환
function alphaLabel(index) {
  let value = index + 1;
  let text = '';
  while (value > 0) {
    const rest = (value - 1) % 26;
    text = String.fromCharCode(65 + rest) + text;
    value = Math.floor((value - 1) / 26);
  }
  return text;
}

// 툴팁용 노드 요약 문자열
function nodeSummary(node) {
  if (!node) return 'null';
  if (node.type === 'text') return 'text';
  return `<${node.tag}>`;
}

// SVG 엘리먼트 생성 헬퍼
function createSvgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, String(value));
  }
  return el;
}

// VDOM 트리를 "그래프 노드 목록" 형태로 평탄화한다.
function collectGraphRecords(node, path = [], depth = 0, records = []) {
  if (!node) return null;
  const id = records.length;
  const record = { id, node, path, depth, children: [], x: 0 };
  records.push(record);

  if (node.type === 'element' && Array.isArray(node.children) && node.children.length > 0) {
    node.children.forEach((child, index) => {
      const childId = collectGraphRecords(child, [...path, index], depth + 1, records);
      if (childId !== null) record.children.push(childId);
    });
  }

  return id;
}

// 트리 레이아웃: 각 노드의 가로 위치(x)를 계산
function assignHorizontalPositions(records, id, layoutState) {
  const record = records[id];
  if (record.children.length === 0) {
    record.x = layoutState.nextX;
    layoutState.nextX += 1;
    return record.x;
  }

  const xs = record.children.map((childId) => assignHorizontalPositions(records, childId, layoutState));
  record.x = xs.reduce((sum, current) => sum + current, 0) / xs.length;
  return record.x;
}

// Tree Visualizer(SVG)를 실제로 그리는 핵심 함수
function renderTreeGraph(vdomTree) {
  const graph = document.querySelector('#tree-graph');
  if (!graph) return;

  if (!vdomTree) {
    graph.textContent = '트리 데이터 없음';
    return;
  }

  const records = [];
  const rootId = collectGraphRecords(vdomTree, [], 0, records);
  if (rootId === null) {
    graph.textContent = '트리 데이터 없음';
    return;
  }

  const layoutState = { nextX: 0 };
  assignHorizontalPositions(records, rootId, layoutState);

  const maxDepth = records.reduce((max, record) => Math.max(max, record.depth), 0);
  const leafCount = Math.max(1, layoutState.nextX);
  const leftPad = 38;
  const topPad = 28;
  const xGap = 72;
  const yGap = 76;
  const rightPad = 170;
  const bottomPad = 34;
  const nodeRadius = 16;
  const maxNodeX = leftPad + (leafCount - 1) * xGap;
  const levelLabelX = maxNodeX + 78;
  const width = maxNodeX + rightPad;
  const height = topPad + maxDepth * yGap + bottomPad;

  const points = new Map();
  records.forEach((record) => {
    points.set(record.id, {
      x: leftPad + record.x * xGap,
      y: topPad + record.depth * yGap,
    });
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'graph-readable';
  const svg = createSvgEl('svg', {
    class: 'graph-svg',
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': 'Virtual DOM tree visualizer',
  });

  for (let level = 0; level <= maxDepth; level += 1) {
    const y = topPad + level * yGap;
    const guide = createSvgEl('line', {
      class: 'graph-level-guide',
      x1: leftPad - nodeRadius,
      y1: y,
      x2: maxNodeX + 28,
      y2: y,
    });
    svg.appendChild(guide);

    const label = createSvgEl('text', {
      class: 'graph-level-label',
      x: levelLabelX,
      y: y + 4,
    });
    label.textContent = `레벨 ${level}`;
    svg.appendChild(label);
  }

  records.forEach((record) => {
    const from = points.get(record.id);
    record.children.forEach((childId) => {
      const to = points.get(childId);
      const line = createSvgEl('line', {
        class: 'graph-edge',
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
      });
      svg.appendChild(line);
    });
  });

  records.forEach((record) => {
    const point = points.get(record.id);
    const group = createSvgEl('g', {
      class: 'graph-point',
      transform: `translate(${point.x}, ${point.y})`,
    });

    const marker = createSvgEl('circle', {
      class: 'graph-node',
      cx: 0,
      cy: 0,
      r: nodeRadius,
      'data-path': record.path.join('.'),
    });
    group.appendChild(marker);

    const label = createSvgEl('text', {
      class: 'graph-node-label',
      x: 0,
      y: 1,
    });
    label.textContent = alphaLabel(record.id);
    group.appendChild(label);

    const tooltip = createSvgEl('title');
    tooltip.textContent = `${alphaLabel(record.id)} ${nodeSummary(record.node)} @ ${pathText(record.path)}`;
    group.appendChild(tooltip);

    svg.appendChild(group);
  });

  wrapper.appendChild(svg);
  graph.replaceChildren(wrapper);
}

// 외부(app.js)에서 트리 미리보기를 갱신할 때 쓰는 공개 함수
export function renderTreePreview(vdomTree) {
  renderTreeGraph(vdomTree);
}

// 공용 렌더 진입점:
// - json-current: before/after + 트리
// - json-diff: diff 트리 + 로그 + 하이라이트
export function renderJson(el, value) {
  if (!el) return;

  if (el.id === 'json-current') {
    const after = cloneValue(value);
    const before = lastAfterTree ? cloneValue(lastAfterTree) : cloneValue(after);
    lastAfterTree = cloneValue(after);

    renderPrettyTree(el, before);
    renderPrettyTree(document.querySelector('#json-after'), after);
    renderTreePreview(after);
    return;
  }

  if (el.id === 'json-diff') {
    const patches = normalizePatches(value);
    const pretty = patches.map((patch) => ({
      type: patch.type,
      path: patch.path,
      detail:
        patch.type === 'TEXT'
          ? patch.text
          : patch.type === 'PROPS'
            ? patch.props
            : patch.type === 'MOVE'
              ? { to: patch.to, key: patch.key ?? null }
              : patch.node ?? null,
    }));

    renderPrettyTree(el, pretty);
    renderPatchLog(patches);
    highlightPatchTargets(patches);
    return;
  }

  renderPrettyTree(el, value);
}
