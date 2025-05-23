import React, { useState, useCallback, useEffect } from 'react';
import { Play, RotateCcw, Settings, FastForward, Pause, SkipForward } from 'lucide-react';

// Types
interface PuzzleState {
  board: number[];
  moves: number;
  heuristic: number;
  path: number[][];
}

interface GeneticConfig {
  populationSize: number;
  maxGenerations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
}

// Utility functions
const GOAL_STATE = [1, 2, 3, 4, 5, 6, 7, 8, 0];

const manhattanDistance = (board: number[]): number => {
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

const tilesOutOfPlace = (board: number[]): number => {
  let count = 0;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== 0 && board[i] !== GOAL_STATE[i]) {
      count++;
    }
  }
  return count;
};

const isSolvable = (board: number[]): boolean => {
  let inversions = 0;
  const flatBoard = board.filter(x => x !== 0);
  for (let i = 0; i < flatBoard.length - 1; i++) {
    for (let j = i + 1; j < flatBoard.length; j++) {
      if (flatBoard[i] > flatBoard[j]) inversions++;
    }
  }
  return inversions % 2 === 0;
};

const getEmptyIndex = (board: number[]): number => board.indexOf(0);

const getValidMoves = (board: number[]): { board: number[], move: string }[] => {
  const emptyIndex = getEmptyIndex(board);
  const moves: { board: number[], move: string }[] = [];
  const row = Math.floor(emptyIndex / 3);
  const col = emptyIndex % 3;

  // Up, Down, Left, Right
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

const isGoalState = (board: number[]): boolean => {
  return board.every((val, idx) => val === GOAL_STATE[idx]);
};

const boardsEqual = (board1: number[], board2: number[]): boolean => {
  return board1.every((val, idx) => val === board2[idx]);
};

// Genetic Algorithm with proper move sequences
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
          progressScore += 10; // Reward for making progress
        }
        
        // Early termination if goal reached
        if (isGoalState(currentBoard)) {
          this.reachedGoal = true;
          break;
        }
      }
    }

    this.finalDistance = manhattanDistance(currentBoard);
    const tilesWrong = tilesOutOfPlace(currentBoard);

    // Fitness calculation - prioritize reaching goal, then minimize distance and moves
    if (this.reachedGoal) {
      this.fitness = 10000 - moveCount; // Higher fitness for fewer moves to goal
    } else {
      // Reward progress towards goal
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

const solvePuzzleGenetic = (
  initialBoard: number[], 
  config: GeneticConfig,
  onProgress?: (generation: number, bestFitness: number, bestIndividual: Individual) => void
): Individual | null => {
  let population = Array.from({ length: config.populationSize }, () => new Individual());
  let bestOverall: Individual | null = null;

  for (let generation = 0; generation < config.maxGenerations; generation++) {
    // Calculate fitness for all individuals
    population.forEach(individual => individual.calculateFitness(initialBoard));
    
    // Sort by fitness (descending)
    population.sort((a, b) => b.fitness - a.fitness);
    
    // Track best solution
    const currentBest = population[0];
    if (!bestOverall || currentBest.fitness > bestOverall.fitness) {
      bestOverall = currentBest.clone();
      bestOverall.calculateFitness(initialBoard); // Ensure path is calculated
    }

    // Report progress
    if (onProgress) {
      onProgress(generation, currentBest.fitness, currentBest);
    }

    // Check if we found a solution
    if (currentBest.reachedGoal) {
      return currentBest;
    }

    // Create new generation
    const newPopulation: Individual[] = [];
    
    // Elitism - keep best individuals
    for (let i = 0; i < config.elitismCount && i < population.length; i++) {
      newPopulation.push(population[i].clone());
    }

    // Generate offspring
    while (newPopulation.length < config.populationSize) {
      // Tournament selection - pick better parents
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

// A* Algorithm for comparison
const solveAStar = (initialBoard: number[]): number[][] => {
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
    
    // Prevent infinite loops - limit search depth
    if (closedSet.size > 100000) {
      break;
    }
  }
  
  return [];
};

const EightPuzzleGame: React.FC = () => {
  const [board, setBoard] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [draggedNumber, setDraggedNumber] = useState<number | null>(null);
  const [solution, setSolution] = useState<number[][]>([]);
  const [astarSolution, setAstarSolution] = useState<number[][]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ generation: 0, fitness: 0, reachedGoal: false, distance: 0 });
  
  const [geneticConfig, setGeneticConfig] = useState<GeneticConfig>({
    populationSize: 200,
    maxGenerations: 100,
    mutationRate: 0.1,
    crossoverRate: 0.8,
    elitismCount: 20
  });

  const handleDragStart = (e: React.DragEvent, number: number) => {
    setDraggedNumber(number);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedNumber === null) return;

    const newBoard = [...board];
    const draggedIndex = newBoard.indexOf(draggedNumber);
    
    // Swap the numbers
    [newBoard[draggedIndex], newBoard[targetIndex]] = [newBoard[targetIndex], newBoard[draggedIndex]];
    setBoard(newBoard);
    setDraggedNumber(null);
  };

  const shuffleBoard = () => {
    const newBoard = [...GOAL_STATE];
    // Perform random valid moves to ensure solvability
    for (let i = 0; i < 100; i++) {
      const validMoves = getValidMoves(newBoard);
      if (validMoves.length > 0) {
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        newBoard.splice(0, 9, ...randomMove.board);
      }
    }
    setBoard(newBoard);
  };

  const solvePuzzle = async () => {
    if (!isSolvable(board)) {
      alert('This puzzle configuration is not solvable!');
      return;
    }

    setIsGenerating(true);
    setSolution([]);
    setAstarSolution([]);
    setCurrentStep(0);
    
    try {
      // Solve with A* for comparison (with timeout)
      console.log('Starting A* solve...');
      const astarPath = solveAStar(board);
      setAstarSolution(astarPath);
      console.log('A* solution found:', astarPath.length - 1, 'moves');

      // Solve with Genetic Algorithm
      console.log('Starting Genetic Algorithm solve...');
      const geneticSolution = solvePuzzleGenetic(board, geneticConfig, (gen, fitness, individual) => {
        setProgress({ 
          generation: gen, 
          fitness, 
          reachedGoal: individual.reachedGoal,
          distance: individual.finalDistance
        });
      });

      if (geneticSolution && geneticSolution.path.length > 0) {
        setSolution(geneticSolution.path);
        console.log('Genetic solution found:', geneticSolution.path.length - 1, 'moves');
        console.log('Reached goal:', geneticSolution.reachedGoal);
      } else {
        console.log('No genetic solution found');
        setSolution([]);
      }
    } catch (error) {
      console.error('Error solving puzzle:', error);
    }

    setIsGenerating(false);
    setIsSetupMode(false);
  };

  const playAnimation = useCallback(() => {
    if (currentStep < solution.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentStep, solution.length]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && solution.length > 0) {
      interval = setInterval(playAnimation, speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playAnimation, speed]);

  const resetPuzzle = () => {
    setBoard([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    setSolution([]);
    setAstarSolution([]);
    setCurrentStep(0);
    setIsPlaying(false);
    setIsSetupMode(true);
  };

  const currentBoard = solution.length > 0 ? solution[currentStep] : board;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          8-Puzzle Genetic Algorithm Solver
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Game Board */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-white">Puzzle Board</h2>
              {isSetupMode && (
                <button
                  onClick={shuffleBoard}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <RotateCcw size={20} />
                  Shuffle
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-2 mx-auto mb-6" style={{ width: 288, height: 288 }}>
              {currentBoard.map((number, index) => (
                <div
                  key={index}
                  className={`
                    flex items-center justify-center text-2xl font-bold rounded-lg border-2 transition-all duration-300
                    ${number === 0 
                      ? 'bg-gray-300/20 border-gray-400/30' 
                      : 'bg-white/90 border-white shadow-lg cursor-move hover:shadow-xl'
                    }
                    ${isSetupMode && number !== 0 ? 'hover:scale-105' : ''}
                  `}
                  style={{ width: 96, height: 96 }}
                  draggable={isSetupMode && number !== 0}
                  onDragStart={(e) => handleDragStart(e, number)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  {number !== 0 ? number : ''}
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4">
              {isSetupMode ? (
                <button
                  onClick={solvePuzzle}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play size={20} />
                  {isGenerating ? 'Solving...' : 'Solve Puzzle'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={solution.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  
                  <button
                    onClick={() => setCurrentStep(Math.min(currentStep + 1, solution.length - 1))}
                    disabled={solution.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <SkipForward size={20} />
                    Step
                  </button>
                  
                  <button
                    onClick={resetPuzzle}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <RotateCcw size={20} />
                    Reset
                  </button>
                </div>
              )}

              {!isSetupMode && solution.length > 0 && (
                <div className="flex items-center gap-4">
                  <label className="text-white font-medium">Speed:</label>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="100"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-white">{speed}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Statistics and Settings */}
          <div className="space-y-6">
            {/* Progress */}
            {isGenerating && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Solving Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-white">
                    <span>Generation:</span>
                    <span>{progress.generation}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Best Fitness:</span>
                    <span>{progress.fitness.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Reached Goal:</span>
                    <span className={progress.reachedGoal ? 'text-green-400' : 'text-red-400'}>
                      {progress.reachedGoal ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Distance to Goal:</span>
                    <span>{progress.distance}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Solution Stats */}
            {(solution.length > 0 || astarSolution.length > 0) && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Solution Comparison</h3>
                <div className="space-y-4">
                  {astarSolution.length > 0 && (
                    <div className="bg-green-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-green-300 mb-2">A* Algorithm (Optimal)</h4>
                      <div className="text-white">
                        <div>Steps: {astarSolution.length - 1}</div>
                        <div>Status: {astarSolution.length > 0 && isGoalState(astarSolution[astarSolution.length - 1]) ? 'Solved ✓' : 'Failed ✗'}</div>
                      </div>
                    </div>
                  )}
                  
                  {solution.length > 0 && (
                    <div className="bg-purple-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-300 mb-2">Genetic Algorithm</h4>
                      <div className="text-white">
                        <div>Steps: {solution.length - 1}</div>
                        <div>Current Step: {currentStep + 1} / {solution.length}</div>
                        <div>Status: {isGoalState(solution[solution.length - 1]) ? 'Solved ✓' : 'Incomplete ✗'}</div>
                        <div>Final Distance: {manhattanDistance(solution[solution.length - 1])}</div>
                      </div>
                    </div>
                  )}

                  {solution.length === 0 && !isGenerating && !isSetupMode && (
                    <div className="bg-red-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-red-300 mb-2">No Solution Found</h4>
                      <p className="text-white text-sm">
                        The genetic algorithm couldn't find a complete solution. Try:
                        <br />• Increasing population size or generations
                        <br />• Using a different puzzle configuration
                        <br />• Adjusting mutation/crossover rates
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Genetic Algorithm Settings */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings size={20} className="text-white" />
                <h3 className="text-xl font-semibold text-white">Genetic Algorithm Settings</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-white mb-2">Population Size: {geneticConfig.populationSize}</label>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    value={geneticConfig.populationSize}
                    onChange={(e) => setGeneticConfig(prev => ({ ...prev, populationSize: Number(e.target.value) }))}
                    className="w-full"
                    disabled={isGenerating}
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">Max Generations: {geneticConfig.maxGenerations}</label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={geneticConfig.maxGenerations}
                    onChange={(e) => setGeneticConfig(prev => ({ ...prev, maxGenerations: Number(e.target.value) }))}
                    className="w-full"
                    disabled={isGenerating}
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">Mutation Rate: {geneticConfig.mutationRate.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.01"
                    max="0.5"
                    step="0.01"
                    value={geneticConfig.mutationRate}
                    onChange={(e) => setGeneticConfig(prev => ({ ...prev, mutationRate: Number(e.target.value) }))}
                    className="w-full"
                    disabled={isGenerating}
                  />
                </div>
                
                <div>
                  <label className="block text-white mb-2">Crossover Rate: {geneticConfig.crossoverRate.toFixed(1)}</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={geneticConfig.crossoverRate}
                    onChange={(e) => setGeneticConfig(prev => ({ ...prev, crossoverRate: Number(e.target.value) }))}
                    className="w-full"
                    disabled={isGenerating}
                  />
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Instructions</h3>
              <div className="text-white/80 space-y-2 text-sm">
                <p>1. <strong>Setup:</strong> Drag and drop numbers to create your puzzle, or click "Shuffle" for a random configuration</p>
                <p>2. <strong>Solve:</strong> Click "Solve Puzzle" to run both A* (optimal) and Genetic algorithms</p>
                <p>3. <strong>Watch:</strong> Use play controls to see the genetic algorithm solution step by step</p>
                <p>4. <strong>Compare:</strong> Check how the genetic algorithm performs vs the optimal A* solution</p>
                <p>5. <strong>Tune:</strong> Adjust parameters if the genetic algorithm fails to find a solution</p>
                <p><strong>Note:</strong> Genetic algorithms don't always find the optimal solution, but show evolutionary problem-solving!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EightPuzzleGame;