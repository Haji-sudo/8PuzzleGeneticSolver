import React, { useState, useCallback, useEffect } from 'react';
import { Play, RotateCcw, Settings, Pause, SkipForward } from 'lucide-react';
import type { GeneticConfig } from '../types/puzzle';
import { GOAL_STATE } from '../types/puzzle';
import { isSolvable, isGoalState, manhattanDistance, getValidMoves } from '../utils/puzzleUtils';
import { solvePuzzleGenetic } from '../algorithms/genetic';
import { solveAStar } from '../algorithms/astar';

const EightPuzzleGame: React.FC = () => {
  // State
  const [board, setBoard] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [draggedNumber, setDraggedNumber] = useState<number | null>(null);
  const [solution, setSolution] = useState<number[][]>([]);
  const [astarSolution, setAstarSolution] = useState<number[][]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ generation: 0, fitness: 0, reachedGoal: false, distance: 0 });
  const [geneticConfig, setGeneticConfig] = useState<GeneticConfig>({
    populationSize: 200,
    maxGenerations: 100,
    mutationRate: 0.1,
    crossoverRate: 0.8,
    elitismCount: 20
  });

  // Handlers
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
    [newBoard[draggedIndex], newBoard[targetIndex]] = [newBoard[targetIndex], newBoard[draggedIndex]];
    setBoard(newBoard);
    setDraggedNumber(null);
  };
  const shuffleBoard = () => {
    const newBoard = [...GOAL_STATE];
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
      const astarPath = solveAStar(board);
      setAstarSolution(astarPath);
      const geneticSolution = solvePuzzleGenetic(board, geneticConfig, (gen, fitness, individual) => {
        setProgress({ generation: gen, fitness, reachedGoal: individual.reachedGoal, distance: individual.finalDistance });
      });
      if (geneticSolution && geneticSolution.path.length > 0) {
        setSolution(geneticSolution.path);
      } else {
        setSolution([]);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
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
      interval = setInterval(playAnimation, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playAnimation]);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 relative">
      <div className="absolute top-4 right-6 z-50 text-sm text-gray-300 font-medium select-none pointer-events-none">
        Created by Alireza Bahari
      </div>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          8-Puzzle Genetic Algorithm Solver
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Game Board */}
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700">
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
                      ? 'bg-gray-700/50 border-gray-600' 
                      : 'bg-gray-700 border-gray-600 shadow-lg cursor-move hover:shadow-xl hover:bg-gray-600'
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
            </div>
          </div>
          {/* Statistics and Settings */}
          <div className="space-y-6">
            {/* Progress */}
            {isGenerating && (
              <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700">
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
              <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Solution Comparison</h3>
                <div className="space-y-4">
                  {astarSolution.length > 0 && (
                    <div className="bg-green-900/30 rounded-lg p-4 border border-green-800">
                      <h4 className="font-semibold text-green-300 mb-2">A* Algorithm (Optimal)</h4>
                      <div className="text-white">
                        <div>Steps: {astarSolution.length - 1}</div>
                        <div>Status: {astarSolution.length > 0 && isGoalState(astarSolution[astarSolution.length - 1]) ? 'Solved ✓' : 'Failed ✗'}</div>
                      </div>
                    </div>
                  )}
                  {solution.length > 0 && (
                    <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-800">
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
                    <div className="bg-red-900/30 rounded-lg p-4 border border-red-800">
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
            <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700">
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
                    className="w-full accent-purple-600"
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
                    className="w-full accent-purple-600"
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
                    className="w-full accent-purple-600"
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
                    className="w-full accent-purple-600"
                    disabled={isGenerating}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EightPuzzleGame; 