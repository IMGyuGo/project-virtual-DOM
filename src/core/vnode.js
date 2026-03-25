// Element VNode는 실제 element 노드를 추상화한 기본 단위다.
// Diff 단계에서 형제 노드를 안정적으로 비교할 수 있도록 key를 함께 보관한다.
export function createElementVNode(tag, props = {}, children = []) {
  // 팀 규칙:
  // 1) props.key가 있으면 최우선 사용
  // 2) 없으면 data-key를 fallback으로 사용
  // 3) 둘 다 없으면 null
  const key = props.key ?? props['data-key'] ?? null;
  return {
    type: 'element',
    tag,
    props,
    key,
    children,
  };
}

// Text VNode는 문자열 내용을 별도 노드로 다루기 위한 최소 단위다.
// element와 구분해야 TEXT patch를 정확하게 계산할 수 있다.
export function createTextVNode(text) {
  return {
    type: 'text',
    text,
  };
}

// 외부에서 들어온 값이 우리 프로젝트의 VNode 형태인지 빠르게 검사한다.
export function isVNode(value) {
  return Boolean(value && (value.type === 'element' || value.type === 'text'));
}
