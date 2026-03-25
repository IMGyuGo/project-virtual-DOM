// TODO(team-diff): key 기반 이동 최적화 고도화
export function hasAnyKey(children = []) {
  return children.some((child) => child?.type === 'element' && child.key != null);
}
