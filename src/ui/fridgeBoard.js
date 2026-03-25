import { createNexusBoard } from './nexusDemo.js';

// Legacy adapter:
// app.js -> samples/fridgeSample.js -> ui/fridgeBoard.js import chain is kept
// so teammates touching non-UI folders don't need to change anything.
export function getSampleItems() {
  return [];
}

export function createFridgeBoard() {
  return createNexusBoard();
}
