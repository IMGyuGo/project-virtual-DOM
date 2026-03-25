import { createFridgeBoard, getSampleItems } from '../ui/fridgeBoard.js';

export function createSampleBoardNode() {
  return createFridgeBoard(getSampleItems());
}
