import {
  bindNexusEditor,
  createNexusBoard,
  toggleAwayMode,
} from './nexusDemo.js';

// 상태 안내 문구를 바꾸는 작은 유틸
function setHint(statusNode, message) {
  if (!statusNode) return;
  statusNode.textContent = message;
}

// 실제 영역과 수정 영역의 HTML이 다르면 한 번 더 맞춰준다.
// (패치 이후 보이는 차이를 줄이기 위한 안전장치)
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

// 데모 초기 상태(방 카드들)를 다시 만든다.
function seedNexusDemo(ui, handlers) {
  ui.testRoot.replaceChildren(createNexusBoard());
  handlers.onPatch();
  if (handlers.withMutationMute) {
    handlers.withMutationMute('seed-reconcile', () => reconcileIfNeeded(ui));
  } else {
    reconcileIfNeeded(ui);
  }
  handlers.onDraftChange?.();
  setHint(ui.status, 'Nexus Home 초기화 완료: 장치 상태를 수정한 뒤 Patch를 눌러 비교하세요.');
}

export function bindControls(ui, handlers) {
  // 상단 컨트롤 바의 버튼 노드들
  const { patchBtn, undoBtn, redoBtn, awayToggleBtn, resetBtn, status, testRoot } = ui;

  // Patch: 수정 뷰의 변경을 실제 뷰에 반영
  patchBtn.addEventListener('click', () => {
    handlers.onPatch();
    const reconciled = handlers.withMutationMute
      ? handlers.withMutationMute('reconcile-after-patch', () => reconcileIfNeeded(ui))
      : reconcileIfNeeded(ui);
    if (reconciled) {
      setHint(status, 'Patch 후 뷰 차이를 자동 동기화했습니다.');
    }
  });
  undoBtn.addEventListener('click', handlers.onUndo);
  redoBtn.addEventListener('click', handlers.onRedo);

  // 외출모드 토글: 테스트 영역 값만 먼저 바꾸고 diff를 갱신
  awayToggleBtn.addEventListener('click', () => {
    const awayOn = toggleAwayMode(testRoot);
    if (awayOn === true) setHint(status, '외출모드 ON으로 변경했습니다. Patch를 눌러 반영하세요.');
    if (awayOn === false) setHint(status, '외출모드 OFF로 변경했습니다. Patch를 눌러 반영하세요.');
    handlers.onDraftChange?.();
  });

  // 초기화 버튼: 샘플 상태로 되돌림
  resetBtn.addEventListener('click', () => {
    seedNexusDemo(ui, handlers);
  });

  // 방 카드 내부 버튼/입력/드래그 이벤트 연결
  bindNexusEditor(testRoot, {
    onStatus: (message) => setHint(status, message),
    onChange: () => handlers.onDraftChange?.(),
  });

  // 첫 렌더 직후 데모 보드를 자동으로 한 번 채운다.
  setTimeout(() => {
    seedNexusDemo(ui, handlers);
  }, 0);
}

// undo/redo 가능 여부에 따라 버튼 활성/비활성 표시
export function syncControlState({ undoBtn, redoBtn }, history) {
  undoBtn.disabled = !history.canUndo();
  redoBtn.disabled = !history.canRedo();
}
