// diff 단계와 patch 단계가 같은 문자열 상수를 공유하도록 patch type을 모아둔다.
// 문자열을 한 곳에서 관리해야 오타를 줄이고, 타입명이 바뀔 때 수정 범위를 최소화할 수 있다.
// MOVE는 같은 부모 안에서 기존 위치(oldIndex)의 노드를 새 위치(newIndex)로 옮기는 의미로 사용한다.
export const PATCH_TYPES = {
  CREATE: 'CREATE',
  REMOVE: 'REMOVE',
  REPLACE: 'REPLACE',
  TEXT: 'TEXT',
  PROPS: 'PROPS',
  MOVE: 'MOVE',
};
