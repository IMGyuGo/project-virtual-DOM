export function createLayout(root) {
  root.innerHTML = `
    <main class="container">
      <header class="top">
        <h1>Virtual DOM 냉장고 재고 보드</h1>
        <p>실제 영역 vs 테스트 영역을 비교하고 Patch를 적용하세요.</p>
      </header>

      <section class="controls" aria-label="컨트롤">
        <button id="btn-patch" type="button">Patch</button>
        <button id="btn-undo" type="button">뒤로가기</button>
        <button id="btn-redo" type="button">앞으로가기</button>
        <span id="status" class="status">준비됨</span>
      </section>

      <section class="boards">
        <article>
          <h2>실제 영역</h2>
          <div id="actual-root" class="panel"></div>
        </article>
        <article>
          <h2>테스트 영역</h2>
          <div id="test-root" class="panel" contenteditable="true"></div>
        </article>
      </section>

      <section class="trees">
        <article>
          <h3>현재 Virtual DOM</h3>
          <pre id="json-current" class="json-box"></pre>
        </article>
        <article>
          <h3>최근 Patch 결과</h3>
          <pre id="json-patches" class="json-box"></pre>
        </article>
      </section>
    </main>
  `;

  return {
    patchBtn: root.querySelector('#btn-patch'),
    undoBtn: root.querySelector('#btn-undo'),
    redoBtn: root.querySelector('#btn-redo'),
    status: root.querySelector('#status'),
    actualRoot: root.querySelector('#actual-root'),
    testRoot: root.querySelector('#test-root'),
    currentTreeViewer: root.querySelector('#json-current'),
    patchViewer: root.querySelector('#json-patches'),
  };
}
