import type { GeneticConfig } from '../types/puzzle';
import { manhattanDistance, tilesOutOfPlace, isGoalState, getValidMoves } from '../utils/puzzleUtils';

class Individual {
  moves: string[];
  fitness: number;
  path: number[][];
  reachedGoal: boolean;
  finalDistance: number;

  constructor(moves?: string[]) {
    this.moves = moves || this.generateRandomMoves();
    this.fitness = 0;
    this.path = [];
    this.reachedGoal = false;
    this.finalDistance = Infinity;
  }

  generateRandomMoves(): string[] {
    const moveTypes = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const maxMoves = 50;
    const moves: string[] = [];
    
    for (let i = 0; i < maxMoves; i++) {
      moves.push(moveTypes[Math.floor(Math.random() * moveTypes.length)]);
    }
    
    return moves;
  }

  calculateFitness(initialBoard: number[]): void {
    let currentBoard = [...initialBoard];
    this.path = [currentBoard];
    let moveCount = 0;
    let minDistanceAchieved = manhattanDistance(currentBoard);
    let progressScore = 0;

    for (const moveType of this.moves) {
      if (isGoalState(currentBoard)) {
        this.reachedGoal = true;
        break;
      }

      const validMoves = getValidMoves(currentBoard);
      const matchingMove = validMoves.find(move => move.move === moveType);
      
      if (matchingMove) {
        currentBoard = [...matchingMove.board];
        this.path.push(currentBoard);
        moveCount++;
        
        const currentDistance = manhattanDistance(currentBoard);
        if (currentDistance < minDistanceAchieved) {
          minDistanceAchieved = currentDistance;
          progressScore += 10;
        }
        
        if (isGoalState(currentBoard)) {
          this.reachedGoal = true;
          break;
        }
      }
    }

    this.finalDistance = manhattanDistance(currentBoard);
    const tilesWrong = tilesOutOfPlace(currentBoard);

    if (this.reachedGoal) {
      this.fitness = 10000 - moveCount;
    } else {
      this.fitness = 1000 - (this.finalDistance * 10) - (tilesWrong * 5) - moveCount + progressScore;
    }
  }

  crossover(other: Individual): Individual {
    const crossoverPoint = Math.floor(Math.random() * Math.min(this.moves.length, other.moves.length));
    const newMoves = [
      ...this.moves.slice(0, crossoverPoint),
      ...other.moves.slice(crossoverPoint)
    ];
    return new Individual(newMoves);
  }

  mutate(mutationRate: number): void {
    const moveTypes = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    
    for (let i = 0; i < this.moves.length; i++) {
      if (Math.random() < mutationRate) {
        this.moves[i] = moveTypes[Math.floor(Math.random() * moveTypes.length)];
      }
    }
  }

  clone(): Individual {
    return new Individual([...this.moves]);
  }
}

const selectParent = (population: Individual[], tournamentSize: number): Individual => {
  let best = population[Math.floor(Math.random() * population.length)];
  
  for (let i = 1; i < tournamentSize; i++) {
    const competitor = population[Math.floor(Math.random() * population.length)];
    if (competitor.fitness > best.fitness) {
      best = competitor;
    }
  }
  
  return best;
};

export const solvePuzzleGenetic = (
  initialBoard: number[], 
  config: GeneticConfig,
  onProgress?: (generation: number, bestFitness: number, bestIndividual: Individual) => void
): Individual | null => {
  let population = Array.from({ length: config.populationSize }, () => new Individual());
  let bestOverall: Individual | null = null;

  for (let generation = 0; generation < config.maxGenerations; generation++) {
    population.forEach(individual => individual.calculateFitness(initialBoard));
    population.sort((a, b) => b.fitness - a.fitness);
    
    const currentBest = population[0];
    if (!bestOverall || currentBest.fitness > bestOverall.fitness) {
      bestOverall = currentBest.clone();
      bestOverall.calculateFitness(initialBoard);
    }

    if (onProgress) {
      onProgress(generation, currentBest.fitness, currentBest);
    }

    if (currentBest.reachedGoal) {
      return currentBest;
    }

    const newPopulation: Individual[] = [];
    
    for (let i = 0; i < config.elitismCount && i < population.length; i++) {
      newPopulation.push(population[i].clone());
    }

    while (newPopulation.length < config.populationSize) {
      const tournamentSize = 5;
      const parent1 = selectParent(population, tournamentSize);
      const parent2 = selectParent(population, tournamentSize);
      
      let offspring;
      if (Math.random() < config.crossoverRate) {
        offspring = parent1.crossover(parent2);
      } else {
        offspring = parent1.clone();
      }
      
      offspring.mutate(config.mutationRate);
      newPopulation.push(offspring);
    }

    population = newPopulation;
  }

  return bestOverall;
}; 