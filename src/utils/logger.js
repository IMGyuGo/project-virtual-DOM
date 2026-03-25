export function patchSummary(patches = []) {
  if (patches.length === 0) return '변경 없음';
  const byType = patches.reduce((acc, patch) => {
    acc[patch.type] = (acc[patch.type] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(byType)
    .map(([type, count]) => `${type}:${count}`)
    .join(', ');
}
