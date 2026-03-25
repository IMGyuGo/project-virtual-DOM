export function createStore(initialTree) {
  return {
    currentTree: initialTree,
    setTree(nextTree) {
      this.currentTree = nextTree;
    },
    getTree() {
      return this.currentTree;
    },
  };
}
