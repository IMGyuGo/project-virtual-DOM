import { domToVdom } from './core/domToVdom.js';
import { mountVdom } from './core/renderVdom.js';
import { diff } from './diff/diff.js';
import { applyPatches } from './patch/applyPatch.js';
import { History } from './state/history.js';
import { createStore } from './state/store.js';
import { createSampleBoardNode } from './samples/fridgeSample.js';
import { createLayout } from './ui/layout.js';
import { bindControls, syncControlState } from './ui/controls.js';
import { renderJson, renderTreePreview } from './ui/jsonTreeViewer.js';
import { patchSummary } from './utils/logger.js';

// 상태 문구(우측 상단 안내 텍스트)를 바꿀 때 쓰는 공통 함수
function setStatus(ui, message) {
  ui.status.textContent = message;
}

// 같은 Virtual DOM 트리를 실제 영역/수정 영역에 동시에 그린다.
function renderBothFromTree(ui, tree) {
  mountVdom(ui.actualRoot, tree);
  mountVdom(ui.testRoot, tree);
}

function bootstrap() {
  // index.html의 #app 비어있는 div에 실제 화면 뼈대를 주입한다.
  const root = document.querySelector('#app');
  const ui = createLayout(root);

  // 첫 화면 샘플 DOM을 만든 뒤, 이를 Virtual DOM 기준 상태로 삼는다.
  const sampleDom = createSampleBoardNode();
  ui.actualRoot.replaceChildren(sampleDom);

  const initialTree = domToVdom(ui.actualRoot.firstElementChild);
  mountVdom(ui.testRoot, initialTree);

  // store: 현재 기준 트리, history: undo/redo용 스냅샷
  const store = createStore(initialTree);
  const history = new History(initialTree);

  // "수정 뷰(test-root)"의 현재 DOM을 읽어 최신 diff를 계산한다.
  const getDraftDiff = () => {
    const latestTestNode = ui.testRoot.firstElementChild;
    if (!latestTestNode) return null;

    const nextTree = domToVdom(latestTestNode);
    const patches = diff(store.getTree(), nextTree);
    return { nextTree, patches };
  };

  // 화면에 보이는 diff/트리 미리보기를 갱신한다.
  const renderDraftDiff = () => {
    const draft = getDraftDiff();
    renderTreePreview(draft ? draft.nextTree : store.getTree());
    renderJson(ui.patchViewer, draft ? draft.patches : []);
  };

  renderJson(ui.currentTreeViewer, store.getTree());
  renderJson(ui.patchViewer, []);
  syncControlState(ui, history);

  // Patch 버튼: 수정 뷰의 변화(diff)를 실제 영역에 반영한다.
  const onPatch = () => {
    const draft = getDraftDiff();
    if (!draft) {
      setStatus(ui, '테스트 영역이 비어 있어 Patch를 중단했습니다.');
      return;
    }

    const { nextTree, patches } = draft;
    if (patches.length === 0) {
      renderDraftDiff();
      syncControlState(ui, history);
      setStatus(ui, '변경 사항이 없어 Patch를 생략했습니다.');
      return;
    }
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
    renderDraftDiff();
    syncControlState(ui, history);
    setStatus(ui, `Patch 적용 완료 (${patchSummary(patches)})`);
  };

  // undo/redo로 복원한 트리를 실제/수정 뷰에 동기화한다.
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

  // 뒤로가기(undo): history 포인터를 한 칸 뒤로
  const onUndo = () => {
    const tree = history.undo();
    syncFromHistory(tree, '뒤로가기');
  };

  // 앞으로가기(redo): history 포인터를 한 칸 앞으로
  const onRedo = () => {
    const tree = history.redo();
    syncFromHistory(tree, '앞으로가기');
  };

  // 버튼/입력 이벤트를 연결하고 최초 상태 문구를 표시
  bindControls(ui, { onPatch, onUndo, onRedo, onDraftChange: renderDraftDiff });
  setStatus(ui, '초기화 완료');
}

bootstrap();
