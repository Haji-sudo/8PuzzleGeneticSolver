import { GOAL_STATE } from '../types/puzzle';

export const manhattanDistance = (board: number[]): number => {
  let distance = 0;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== 0) {
      const targetRow = Math.floor((board[i] - 1) / 3);
      const targetCol = (board[i] - 1) % 3;
      const currentRow = Math.floor(i / 3);
      const currentCol = i % 3;
      distance += Math.abs(targetRow - currentRow) + Math.abs(targetCol - currentCol);
    }
  }
  return distance;
};

export const tilesOutOfPlace = (board: number[]): number => {
  let count = 0;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== 0 && board[i] !== GOAL_STATE[i]) {
      count++;
    }
  }
  return count;
};

export const isSolvable = (board: number[]): boolean => {
  let inversions = 0;
  const flatBoard = board.filter(x => x !== 0);
  for (let i = 0; i < flatBoard.length - 1; i++) {
    for (let j = i + 1; j < flatBoard.length; j++) {
      if (flatBoard[i] > flatBoard[j]) inversions++;
    }
  }
  return inversions % 2 === 0;
};

export const getEmptyIndex = (board: number[]): number => board.indexOf(0);

export const getValidMoves = (board: number[]): { board: number[], move: string }[] => {
  const emptyIndex = getEmptyIndex(board);
  const moves: { board: number[], move: string }[] = [];
  const row = Math.floor(emptyIndex / 3);
  const col = emptyIndex % 3;

  const directions = [
    { dr: -1, dc: 0, name: 'UP' },
    { dr: 1, dc: 0, name: 'DOWN' },
    { dr: 0, dc: -1, name: 'LEFT' },
    { dr: 0, dc: 1, name: 'RIGHT' }
  ];
  
  directions.forEach(({ dr, dc, name }) => {
    const newRow = row + dr;
    const newCol = col + dc;
    if (newRow >= 0 && newRow < 3 && newCol >= 0 && newCol < 3) {
      const swapIndex = newRow * 3 + newCol;
      const newBoard = [...board];
      [newBoard[emptyIndex], newBoard[swapIndex]] = [newBoard[swapIndex], newBoard[emptyIndex]];
      moves.push({ board: newBoard, move: name });
    }
  });

  return moves;
};

export const isGoalState = (board: number[]): boolean => {
  return board.every((val, idx) => val === GOAL_STATE[idx]);
};

export const boardsEqual = (board1: number[], board2: number[]): boolean => {
  return board1.every((val, idx) => val === board2[idx]);
}; 