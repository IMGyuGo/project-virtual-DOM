export function diffProps(oldProps = {}, newProps = {}) {
  const set = {};
  const remove = [];

  for (const [key, value] of Object.entries(newProps)) {
    if (oldProps[key] !== value) set[key] = value;
  }

  for (const key of Object.keys(oldProps)) {
    if (!(key in newProps)) remove.push(key);
  }

  return { set, remove };
}
