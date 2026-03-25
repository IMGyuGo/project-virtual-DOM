import { domToVdom } from './core/domToVdom.js';
import { mountVdom } from './core/renderVdom.js';
import { diff } from './diff/diff.js';
import { applyPatches } from './patch/applyPatch.js';
import { History } from './state/history.js';
import { createStore } from './state/store.js';
import { createSampleBoardNode } from './samples/fridgeSample.js';
import { createLayout } from './ui/layout.js';
import { bindControls, syncControlState } from './ui/controls.js';
import { renderJson } from './ui/jsonTreeViewer.js';
import { patchSummary } from './utils/logger.js';

function setStatus(ui, message) {
  ui.status.textContent = message;
}

function renderBothFromTree(ui, tree) {
  mountVdom(ui.actualRoot, tree);
  mountVdom(ui.testRoot, tree);
}

function bootstrap() {
  const root = document.querySelector('#app');
  const ui = createLayout(root);

  const sampleDom = createSampleBoardNode();
  ui.actualRoot.replaceChildren(sampleDom);

  const initialTree = domToVdom(ui.actualRoot.firstElementChild);
  mountVdom(ui.testRoot, initialTree);

  const store = createStore(initialTree);
  const history = new History(initialTree);

  const getDraftDiff = () => {
    const latestTestNode = ui.testRoot.firstElementChild;
    if (!latestTestNode) return null;

    const nextTree = domToVdom(latestTestNode);
    const patches = diff(store.getTree(), nextTree);
    return { nextTree, patches };
  };

  const renderDraftDiff = () => {
    const draft = getDraftDiff();
    renderJson(ui.patchViewer, draft ? draft.patches : []);
  };

  renderJson(ui.currentTreeViewer, store.getTree());
  renderJson(ui.patchViewer, []);
  syncControlState(ui, history);

  const onPatch = () => {
    const draft = getDraftDiff();
    if (!draft) {
      setStatus(ui, '테스트 영역이 비어 있어 Patch를 중단했습니다.');
      return;
    }

    const { nextTree, patches } = draft;
    const currentActualNode = ui.actualRoot.firstElementChild;

    if (currentActualNode) {
      const updatedNode = applyPatches(currentActualNode, patches);
      if (updatedNode !== currentActualNode) {
        ui.actualRoot.replaceChildren(updatedNode);
      }
    } else {
      mountVdom(ui.actualRoot, nextTree);
    }

    history.push(nextTree);
    store.setTree(nextTree);

    renderJson(ui.currentTreeViewer, nextTree);
    renderJson(ui.patchViewer, patches);
    syncControlState(ui, history);
    setStatus(ui, `Patch 적용 완료 (${patchSummary(patches)})`);
  };

  const syncFromHistory = (tree, actionText) => {
    if (!tree) {
      setStatus(ui, `${actionText}할 상태가 없습니다.`);
      return;
    }

    store.setTree(tree);
    renderBothFromTree(ui, tree);
    renderJson(ui.currentTreeViewer, tree);
    renderDraftDiff();
    syncControlState(ui, history);
    setStatus(ui, `${actionText} 완료`);
  };

  const onUndo = () => {
    const tree = history.undo();
    syncFromHistory(tree, '뒤로가기');
  };

  const onRedo = () => {
    const tree = history.redo();
    syncFromHistory(tree, '앞으로가기');
  };

  bindControls(ui, { onPatch, onUndo, onRedo, onDraftChange: renderDraftDiff });
  setStatus(ui, '초기화 완료');
}

bootstrap();
