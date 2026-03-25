// diff 단계와 patch 단계가 같은 문자열 상수를 공유하도록 patch type을 모아둔다.
// 문자열을 한 곳에서 관리해야 오타를 줄이고, 타입명이 바뀔 때 수정 범위를 최소화할 수 있다.
export const PATCH_TYPES = {
  CREATE: 'CREATE',
  REMOVE: 'REMOVE',
  REPLACE: 'REPLACE',
  TEXT: 'TEXT',
  PROPS: 'PROPS',
};
