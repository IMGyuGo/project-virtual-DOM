import { cloneDeep } from '../utils/clone.js';

function isSameSnapshot(a, b) {
  // 현재 프로젝트 규모에서는 JSON 기반 deep 비교로 충분하다.
  // (VNode는 순환 참조를 갖지 않는 단순 객체라는 전제)
  return JSON.stringify(a) === JSON.stringify(b);
}

export class History {
  constructor(initialState) {
    // stack: 시점별 스냅샷 배열
    // pointer: 현재 시점을 가리키는 인덱스
    this.stack = [cloneDeep(initialState)];
    this.pointer = 0;
  }

  current() {
    // 외부에서 참조를 직접 바꾸지 못하도록 복제본을 반환한다.
    return cloneDeep(this.stack[this.pointer]);
  }

  push(nextState) {
    const snapshot = cloneDeep(nextState);

    // 동일 상태는 새 타임라인으로 취급하지 않는다.
    // (예: 변경 없는 Patch 클릭 시) redo 가지를 불필요하게 지우지 않기 위함.
    if (isSameSnapshot(this.stack[this.pointer], snapshot)) {
      return this.current();
    }

    // undo 이후 새 변경이 들어오면 pointer 뒤의 미래(redo 가지)는 버린다.
    // 타임라인 관점에서 "다른 선택을 한 새 미래"가 시작되기 때문.
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push(snapshot);
    this.pointer = this.stack.length - 1;
    return this.current();
  }

  undo() {
    // 더 과거가 없으면 null 반환(호출부에서 상태 메시지 처리).
    if (this.pointer <= 0) return null;
    this.pointer -= 1;
    return this.current();
  }

  redo() {
    // 더 미래가 없으면 null 반환(호출부에서 상태 메시지 처리).
    if (this.pointer >= this.stack.length - 1) return null;
    this.pointer += 1;
    return this.current();
  }

  canUndo() {
    // UI 버튼 활성/비활성 판단에 사용한다.
    return this.pointer > 0;
  }

  canRedo() {
    // UI 버튼 활성/비활성 판단에 사용한다.
    return this.pointer < this.stack.length - 1;
  }
}
