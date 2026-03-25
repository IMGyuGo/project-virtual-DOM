export function createStore(initialTree) {
  // app 전역에서 현재 기준 트리(실제 반영 기준)를 읽고 쓰는 최소 저장소.
  // history는 시점 스냅샷 관리, store는 "현재값" 단일 참조 관리에 집중한다.
  return {
    currentTree: initialTree,
    setTree(nextTree) {
      // Patch/Undo/Redo 이후 현재 기준 트리를 갱신한다.
      this.currentTree = nextTree;
    },
    getTree() {
      // diff의 oldTree 기준으로 사용할 현재 트리를 반환한다.
      return this.currentTree;
    },
  };
}
