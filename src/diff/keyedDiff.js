// 노드에서 key 값을 꺼낸다.
// element vnode만 key를 가지므로, 그 외 노드는 null로 처리해 keyed 비교 대상을 명확하게 제한한다.
export function getNodeKey(child) {
  if (!child || child.type !== 'element') return null;
  return child.key ?? null;
}

// 자식 배열 안에 key를 가진 노드가 하나라도 있는지 확인한다.
// key가 하나라도 있으면 index 기준보다 key 기준 비교가 더 안전하므로 분기 판단에 사용한다.
export function hasAnyKey(children = []) {
  return children.some((child) => getNodeKey(child) != null);
}

// keyed 비교에서 사용할 pair 객체 형태를 한 곳에서 만든다.
// diff.js가 key 기반 비교 결과를 분기 없이 읽을 수 있도록 모든 필드를 같은 규격으로 맞춘다.
function createKeyedPair({
  oldChild = null,
  newChild = null,
  pathIndex,
  oldIndex = null,
  newIndex = null,
  key = null,
}) {
  return {
    oldChild,
    newChild,
    pathIndex,
    oldIndex,
    newIndex,
    key,
  };
}

// 중복 key를 감지했을 때 개발 중 바로 알아차릴 수 있도록 경고를 남긴다.
// key 기반 비교는 "같은 부모 안에서 key가 고유하다"는 전제가 중요하므로, 중복을 조용히 넘기지 않고 드러내는 편이 안전하다.
function warnDuplicateKey(key, index, sourceLabel) {
  console.warn(`[diff/keyedDiff] 중복 key 감지: "${key}" (${sourceLabel}, index: ${index})`);
}

function warnMissingKey(index, sourceLabel) {
  console.warn(`[diff/keyedDiff] key 누락 감지: (${sourceLabel}, index: ${index})`);
}

// 자식 배열 안에서 key가 중복되는지 미리 확인한다.
// old/new 어느 쪽에서든 고유 key 규칙이 깨지면 MOVE/CREATE/REMOVE 판단이 흔들릴 수 있으므로, pair 생성 전에 경고를 남긴다.
function validateUniqueKeys(children = [], sourceLabel) {
  const seenKeys = new Set();

  children.forEach((child, index) => {
    const key = getNodeKey(child);
    if (key == null) return;

    if (seenKeys.has(key)) {
      warnDuplicateKey(key, index, sourceLabel);
      return;
    }

    seenKeys.add(key);
  });
}

function validateKeyCompleteness(children = [], sourceLabel) {
  if (!hasAnyKey(children)) return;

  children.forEach((child, index) => {
    if (!child || child.type !== 'element') return;
    if (getNodeKey(child) != null) return;

    warnMissingKey(index, sourceLabel);
  });
}

// 자식 배열을 key로 빠르게 찾을 수 있도록 Map으로 만든다.
// 새 자식을 순회하면서 같은 key를 즉시 찾기 위해 기존 위치 정보도 함께 저장한다.
export function buildKeyMap(children = []) {
  const keyMap = new Map();

  children.forEach((child, index) => {
    const key = getNodeKey(child);
    if (key == null) return;

    if (keyMap.has(key)) {
      // 중복 key는 validateUniqueKeys에서 이미 경고했으므로, 첫 매칭 기준을 유지하며 뒤쪽 중복은 건너뛴다.
      return;
    }

    keyMap.set(key, { child, index });
  });

  return keyMap;
}

// key가 있는 자식 배열을 같은 key끼리 먼저 매칭한다.
// 이렇게 해야 앞에 항목이 추가되거나 위치가 바뀌어도 기존 노드 전체를 바뀐 것으로 보지 않고,
// CREATE / REMOVE / MOVE 후보를 더 정확하게 구분할 수 있다.
export function collectKeyedPairs(oldChildren = [], newChildren = []) {
  validateUniqueKeys(oldChildren, 'oldChildren');
  validateUniqueKeys(newChildren, 'newChildren');
  validateKeyCompleteness(oldChildren, 'oldChildren');
  validateKeyCompleteness(newChildren, 'newChildren');

  const oldKeyMap = buildKeyMap(oldChildren);
  const matchedKeys = new Set();
  const pairs = [];

  newChildren.forEach((newChild, newIndex) => {
    const key = getNodeKey(newChild);

    if (key != null && oldKeyMap.has(key)) {
      const { child: oldChild, index: oldIndex } = oldKeyMap.get(key);

      matchedKeys.add(key);
      pairs.push(
        createKeyedPair({
          oldChild,
          newChild,
          pathIndex: newIndex,
          oldIndex,
          newIndex,
          key,
        }),
      );
      return;
    }

    // 새 트리에만 있는 key는 CREATE 대상이므로 oldChild를 null로 둔다.
    // pathIndex는 실제 삽입 위치를 가리켜야 하므로 새 배열의 index를 사용한다.
    pairs.push(
      createKeyedPair({
        oldChild: null,
        newChild,
        pathIndex: newIndex,
        oldIndex: null,
        newIndex,
        key,
      }),
    );
  });

  oldChildren.forEach((oldChild, oldIndex) => {
    const key = getNodeKey(oldChild);

    if (key == null || matchedKeys.has(key)) return;

    // 이전 트리에만 남은 key는 REMOVE 대상이므로 newChild를 null로 둔다.
    // pathIndex는 현재 DOM에서 제거해야 하는 기존 위치를 가리켜야 하므로 old index를 사용한다.
    pairs.push(
      createKeyedPair({
        oldChild,
        newChild: null,
        pathIndex: oldIndex,
        oldIndex,
        newIndex: null,
        key,
      }),
    );
  });

  return pairs;
}
