function formatTime(date = new Date()) {
  return date.toLocaleTimeString('ko-KR', { hour12: false });
}

function nodeLabel(node) {
  if (!node) return '(null)';
  if (node.nodeType === Node.TEXT_NODE) return '#text';
  if (node.nodeType !== Node.ELEMENT_NODE) return node.nodeName.toLowerCase();

  const id = node.id ? `#${node.id}` : '';
  const cls = node.classList?.length ? `.${Array.from(node.classList).slice(0, 2).join('.')}` : '';
  return `${node.tagName.toLowerCase()}${id}${cls}`;
}

function summarizeRecord(record) {
  if (record.type === 'attributes') {
    return `attributes @ ${nodeLabel(record.target)} [${record.attributeName}]`;
  }
  if (record.type === 'characterData') {
    return `characterData @ ${nodeLabel(record.target?.parentElement ?? record.target)}`;
  }
  const added = record.addedNodes?.length ?? 0;
  const removed = record.removedNodes?.length ?? 0;
  return `childList @ ${nodeLabel(record.target)} (+${added}, -${removed})`;
}

function renderMetrics(el, metrics) {
  if (!el) return;
  const chips = [
    `rAF flush: ${metrics.rafFlushes}`,
    `debounce flush: ${metrics.debounceFlushes}`,
    `frame records: ${metrics.lastFrameSize}`,
    `queued: ${metrics.pending}`,
    `ignored(self): ${metrics.ignored}`,
  ];

  el.replaceChildren(
    ...chips.map((text) => {
      const chip = document.createElement('span');
      chip.className = 'metric-chip';
      chip.textContent = text;
      return chip;
    }),
  );
}

function renderRows(el, rows) {
  if (!el) return;

  if (rows.length === 0) {
    const muted = document.createElement('p');
    muted.className = 'log-row muted';
    muted.textContent = '아직 감지된 DOM mutation이 없습니다.';
    el.replaceChildren(muted);
    return;
  }

  const nodes = rows.slice(0, 24).map((row) => {
    const line = document.createElement('p');
    line.className = 'log-row';
    line.textContent = row;
    return line;
  });
  el.replaceChildren(...nodes);
}

export function createMutationObserverPanel({ targetNode, metricsEl, logEl, debounceMs = 140 }) {
  const state = {
    rafId: null,
    debounceId: null,
    frameBuffer: [],
    renderBuffer: [],
    renderedRows: [],
    muteDepth: 0,
    metrics: {
      rafFlushes: 0,
      debounceFlushes: 0,
      lastFrameSize: 0,
      pending: 0,
      ignored: 0,
    },
  };

  renderMetrics(metricsEl, state.metrics);
  renderRows(logEl, state.renderedRows);

  function flushDebouncedRows() {
    state.metrics.debounceFlushes += 1;
    const prefix = `[${formatTime()}] debounce#${state.metrics.debounceFlushes}`;
    const lines = state.renderBuffer.map((entry) => `${prefix} ${entry}`);
    state.renderBuffer = [];
    state.metrics.pending = 0;
    state.renderedRows = [...lines.reverse(), ...state.renderedRows].slice(0, 48);
    renderRows(logEl, state.renderedRows);
    renderMetrics(metricsEl, state.metrics);
  }

  function scheduleDebouncedRender() {
    if (state.debounceId) clearTimeout(state.debounceId);
    state.debounceId = setTimeout(() => {
      flushDebouncedRows();
      state.debounceId = null;
    }, debounceMs);
  }

  function flushFrame() {
    state.rafId = null;
    if (state.frameBuffer.length === 0) return;

    state.metrics.rafFlushes += 1;
    state.metrics.lastFrameSize = state.frameBuffer.length;

    const framePrefix = `rAF#${state.metrics.rafFlushes}`;
    const entries = state.frameBuffer.map((record) => `${framePrefix} ${summarizeRecord(record)}`);
    state.frameBuffer = [];
    state.renderBuffer.push(...entries);
    state.metrics.pending = state.renderBuffer.length;

    renderMetrics(metricsEl, state.metrics);
    scheduleDebouncedRender();
  }

  function scheduleFrame() {
    if (state.rafId != null) return;
    state.rafId = requestAnimationFrame(flushFrame);
  }

  const observer = new MutationObserver((records) => {
    if (state.muteDepth > 0) {
      state.metrics.ignored += records.length;
      renderMetrics(metricsEl, state.metrics);
      return;
    }

    state.frameBuffer.push(...records);
    scheduleFrame();
  });

  function observe() {
    if (!targetNode) return;
    observer.observe(targetNode, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  }

  function disconnect() {
    observer.disconnect();
    if (state.rafId != null) cancelAnimationFrame(state.rafId);
    if (state.debounceId) clearTimeout(state.debounceId);
    state.rafId = null;
    state.debounceId = null;
  }

  // 프로젝트 내부에서 의도적으로 actualRoot를 수정할 때
  // observer 기록을 잠시 무시해 "자기 자신이 만든 mutation" 노이즈를 줄인다.
  function withObserverMute(label, callback) {
    state.muteDepth += 1;
    void label;
    try {
      return callback();
    } finally {
      setTimeout(() => {
        state.muteDepth = Math.max(0, state.muteDepth - 1);
      }, 0);
    }
  }

  return {
    observe,
    disconnect,
    withObserverMute,
  };
}
