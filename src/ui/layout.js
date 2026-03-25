export function createLayout(root) {
  // 실제 HTML 마크업을 JS로 한 번에 그려 넣는다.
  // index.html에는 #app만 있고, 화면 구조는 여기서 만들어진다.
  root.innerHTML = `
    <main class="nexus-shell">
      <header class="hero">
        <p class="eyebrow">Virtual DOM Smart Home Demo</p>
        <h1>Nexus Home (넥서스 홈)</h1>
        <p>
          실시간으로 집안의 모든 기기 상태를 모니터링하고 제어하는 Virtual DOM 기반 대시보드입니다.
        </p>
      </header>

      <section class="controls command-bar" aria-label="컨트롤">
        <button id="btn-patch" type="button">Patch</button>
        <button id="btn-undo" type="button">뒤로가기</button>
        <button id="btn-redo" type="button">앞으로가기</button>
        <button id="btn-away-toggle" type="button">외출모드 ON OFF</button>
        <button id="btn-reset" type="button">초기화</button>
        <span id="status" class="status">준비됨</span>
      </section>

      <section class="main-grid">
        <article class="panel-card">
          <h2>현재 Nexus Home 상태 (수정 불가능)</h2>
          <p>실제 적용된 DOM 상태를 보여주는 영역입니다.</p>
          <div id="actual-root" class="panel readonly-root"></div>
        </article>
        <article class="panel-card">
          <h2>Nexus Home 상태 수정 뷰</h2>
          <p>장치 제어 버튼/입력만 수정 가능합니다. 변경 후 Patch로 실제 영역에 반영하세요.</p>
          <div id="test-root" class="panel editable-root"></div>
        </article>
      </section>

      <section class="trees tree-grid">
        <article class="panel-card">
          <h3>Real-time Patch Log</h3>
          <p class="tree-caption">가장 최근 diff 결과를 이벤트 로그로 표시합니다. 페이지를 수정하면 자동으로 갱신됩니다.</p>
          <div id="patch-log" class="patch-log"></div>
        </article>
        <article class="panel-card">
          <h3>Diff 결과 (달라진 내용)</h3>
          <p class="tree-caption">가장 최근 diff 결과를 구조화된 트리로 보여줍니다. 페이지를 수정하면 자동으로 갱신됩니다.</p>
          <pre id="json-diff" class="json-box"></pre>
        </article>
        <article class="panel-card">
          <h3>Patch 전 Virtual DOM</h3>
          <pre id="json-current" class="json-box"></pre>
        </article>
        <article class="panel-card">
          <h3>Patch 될 Virtual DOM</h3>
          <pre id="json-after" class="json-box"></pre>
        </article>
      </section>

      <section class="panel-card visualizer">
        <h3>Tree Visualizer</h3>
        <p>트리 구조를 점과 선으로 표현합니다. 변경 path 노드는 반짝 표시됩니다.</p>
        <div id="tree-graph" class="tree-graph"></div>
      </section>
    </main>
  `;

  // 이후 다른 파일(app.js, controls.js 등)에서 쉽게 쓰도록
  // 자주 쓰는 DOM 노드들을 한 객체로 묶어 반환한다.
  return {
    patchBtn: root.querySelector('#btn-patch'),
    undoBtn: root.querySelector('#btn-undo'),
    redoBtn: root.querySelector('#btn-redo'),
    awayToggleBtn: root.querySelector('#btn-away-toggle'),
    resetBtn: root.querySelector('#btn-reset'),
    status: root.querySelector('#status'),
    actualRoot: root.querySelector('#actual-root'),
    testRoot: root.querySelector('#test-root'),
    currentTreeViewer: root.querySelector('#json-current'),
    patchViewer: root.querySelector('#json-diff'),
    patchLog: root.querySelector('#patch-log'),
    afterTreeViewer: root.querySelector('#json-after'),
    treeGraph: root.querySelector('#tree-graph'),
  };
}
