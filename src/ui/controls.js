import {
  addOneHour,
  bindNexusEditor,
  createNexusBoard,
  toggleAwayMode,
} from './nexusDemo.js';

function setHint(statusNode, message) {
  if (!statusNode) return;
  statusNode.textContent = message;
}

function reconcileIfNeeded(ui) {
  const actual = ui.actualRoot.firstElementChild;
  const test = ui.testRoot.firstElementChild;
  if (!actual || !test) return false;

  if (actual.outerHTML !== test.outerHTML) {
    ui.actualRoot.replaceChildren(test.cloneNode(true));
    return true;
  }
  return false;
}

function seedNexusDemo(ui, handlers) {
  ui.testRoot.replaceChildren(createNexusBoard());
  handlers.onPatch();
  reconcileIfNeeded(ui);
  handlers.onDraftChange?.();
  setHint(ui.status, 'Nexus Home 초기화 완료: 장치 상태를 수정한 뒤 Patch를 눌러 비교하세요.');
}

export function bindControls(ui, handlers) {
  const { patchBtn, undoBtn, redoBtn, awayToggleBtn, hourPlusBtn, resetBtn, status, testRoot } = ui;

  patchBtn.addEventListener('click', () => {
    handlers.onPatch();
    const reconciled = reconcileIfNeeded(ui);
    if (reconciled) {
      setHint(status, 'Patch 후 뷰 차이를 자동 동기화했습니다.');
    }
  });
  undoBtn.addEventListener('click', handlers.onUndo);
  redoBtn.addEventListener('click', handlers.onRedo);

  awayToggleBtn.addEventListener('click', () => {
    const awayOn = toggleAwayMode(testRoot);
    if (awayOn === true) setHint(status, '외출모드 ON으로 변경했습니다. Patch를 눌러 반영하세요.');
    if (awayOn === false) setHint(status, '외출모드 OFF로 변경했습니다. Patch를 눌러 반영하세요.');
    handlers.onDraftChange?.();
  });

  hourPlusBtn.addEventListener('click', () => {
    const changed = addOneHour(testRoot);
    if (changed) setHint(status, '시간을 1시간 진행했습니다. Patch를 눌러 반영하세요.');
    handlers.onDraftChange?.();
  });

  resetBtn.addEventListener('click', () => {
    seedNexusDemo(ui, handlers);
  });

  bindNexusEditor(testRoot, {
    onStatus: (message) => setHint(status, message),
    onChange: () => handlers.onDraftChange?.(),
  });

  setTimeout(() => {
    seedNexusDemo(ui, handlers);
  }, 0);
}

export function syncControlState({ undoBtn, redoBtn }, history) {
  undoBtn.disabled = !history.canUndo();
  redoBtn.disabled = !history.canRedo();
}
