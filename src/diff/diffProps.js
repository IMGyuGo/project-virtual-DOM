// 이전 props와 다음 props를 비교해 변경 사항만 추린다.
// patch 단계에서는 바뀐 값과 제거할 값만 알면 되므로, set과 remove로 나눠 최소 정보만 반환한다.
export function diffProps(oldProps = {}, newProps = {}) {
  const set = {};
  const remove = [];

  // 다음 props를 기준으로 값이 달라진 항목만 set에 담는다.
  // 실제 DOM 갱신 시 변경된 속성만 적용해야 불필요한 attribute 재설정을 줄일 수 있다.
  for (const [key, value] of Object.entries(newProps)) {
    if (oldProps[key] !== value) set[key] = value;
  }

  // 이전에는 있었지만 다음 props에는 없는 항목은 remove에 담는다.
  // 삭제 대상을 분리해두면 patch 적용 단계에서 removeAttribute로 명확하게 처리할 수 있다.
  for (const key of Object.keys(oldProps)) {
    if (!(key in newProps)) remove.push(key);
  }

  return { set, remove };
}
