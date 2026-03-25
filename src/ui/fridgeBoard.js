const sampleItems = [
  { id: 'banana', name: '바나나', qty: 6, exp: '2026-03-30' },
  { id: 'milk', name: '우유', qty: 1, exp: '2026-03-27' },
  { id: 'egg', name: '계란', qty: 12, exp: '2026-04-05' },
];

export function getSampleItems() {
  return sampleItems.map((item) => ({ ...item }));
}

export function createFridgeBoard(items) {
  const section = document.createElement('section');
  section.className = 'fridge-board';

  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'food-card';
    card.setAttribute('data-key', item.id);

    card.innerHTML = `
      <h4>${item.name}</h4>
      <p>수량: <strong>${item.qty}</strong></p>
      <p>유통기한: <time datetime="${item.exp}">${item.exp}</time></p>
    `;

    section.appendChild(card);
  }

  return section;
}
