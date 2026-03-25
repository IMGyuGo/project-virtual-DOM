import { cloneDeep } from '../utils/clone.js';

export class History {
  constructor(initialState) {
    this.stack = [cloneDeep(initialState)];
    this.pointer = 0;
  }

  current() {
    return cloneDeep(this.stack[this.pointer]);
  }

  push(nextState) {
    const snapshot = cloneDeep(nextState);
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push(snapshot);
    this.pointer = this.stack.length - 1;
    return this.current();
  }

  undo() {
    if (this.pointer <= 0) return null;
    this.pointer -= 1;
    return this.current();
  }

  redo() {
    if (this.pointer >= this.stack.length - 1) return null;
    this.pointer += 1;
    return this.current();
  }

  canUndo() {
    return this.pointer > 0;
  }

  canRedo() {
    return this.pointer < this.stack.length - 1;
  }
}
