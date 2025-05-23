import type { PuzzleState } from '../types/puzzle';
import { manhattanDistance, isGoalState, getValidMoves } from '../utils/puzzleUtils';

export const solveAStar = (initialBoard: number[]): number[][] => {
  const openSet: PuzzleState[] = [{
    board: [...initialBoard],
    moves: 0,
    heuristic: manhattanDistance(initialBoard),
    path: [initialBoard]
  }];
  
  const closedSet = new Set<string>();
  
  while (openSet.length > 0) {
    openSet.sort((a, b) => (a.moves + a.heuristic) - (b.moves + b.heuristic));
    const current = openSet.shift()!;
    
    if (isGoalState(current.board)) {
      return current.path;
    }
    
    const boardStr = current.board.toString();
    if (closedSet.has(boardStr)) continue;
    closedSet.add(boardStr);
    
    const validMoves = getValidMoves(current.board);
    for (const { board: moveBoard } of validMoves) {
      const moveStr = moveBoard.toString();
      if (!closedSet.has(moveStr)) {
        openSet.push({
          board: moveBoard,
          moves: current.moves + 1,
          heuristic: manhattanDistance(moveBoard),
          path: [...current.path, moveBoard]
        });
      }
    }
    
    if (closedSet.size > 100000) {
      break;
    }
  }
  
  return [];
}; 