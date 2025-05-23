export interface PuzzleState {
  board: number[];
  moves: number;
  heuristic: number;
  path: number[][];
}

export interface GeneticConfig {
  populationSize: number;
  maxGenerations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
}

export const GOAL_STATE = [1, 2, 3, 4, 5, 6, 7, 8, 0]; 