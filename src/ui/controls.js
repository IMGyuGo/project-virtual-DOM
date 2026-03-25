export function bindControls({ patchBtn, undoBtn, redoBtn }, handlers) {
  patchBtn.addEventListener('click', handlers.onPatch);
  undoBtn.addEventListener('click', handlers.onUndo);
  redoBtn.addEventListener('click', handlers.onRedo);
}

export function syncControlState({ undoBtn, redoBtn }, history) {
  undoBtn.disabled = !history.canUndo();
  redoBtn.disabled = !history.canRedo();
}
