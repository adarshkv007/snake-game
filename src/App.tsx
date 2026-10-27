import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

// Types
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };
type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'idle' | 'playing' | 'paused' | 'gameover';
type CellType = 'empty' | 'snake-head' | 'snake-body' | 'food';

interface GridCell {
  key: string;
  type: CellType;
  index: number;
}

// Constants
const GRID_SIZE = 20;

const SPEED_MAP: Record<Difficulty, number> = {
  easy: 150,
  medium: 100,
  hard: 65,
};

const SCORE_MAP: Record<Difficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 20,
};

const DIRECTION_MAP: Record<Direction, Position> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

// Helper functions
function getRandomPosition(exclude: Position[]): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (exclude.some((p) => p.x === pos.x && p.y === pos.y));
  return pos;
}

function getInitialSnake(): Position[] {
  const mid = Math.floor(GRID_SIZE / 2);
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

function loadHighScores(): Record<Difficulty, number> {
  try {
    const stored = localStorage.getItem('snake-high-scores');
    if (stored) {
      const parsed = JSON.parse(stored) as Record<Difficulty, number>;
      if (
        typeof parsed.easy === 'number' &&
        typeof parsed.medium === 'number' &&
        typeof parsed.hard === 'number'
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return { easy: 0, medium: 0, hard: 0 };
}

// Main App Component
export default function App() {
  const [snake, setSnake] = useState<Position[]>(getInitialSnake);
  const [food, setFood] = useState<Position>(() => getRandomPosition(getInitialSnake()));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScores, setHighScores] = useState<Record<Difficulty, number>>(loadHighScores);

  const directionRef = useRef<Direction>(direction);
  const gameStateRef = useRef<GameState>(gameState);
  const snakeRef = useRef<Position[]>(snake);
  const foodRef = useRef<Position>(food);
  const scoreRef = useRef<number>(score);
  const difficultyRef = useRef<Difficulty>(difficulty);
  const gameLoopRef = useRef<number | null>(null);
  const lastDirectionRef = useRef<Direction>(direction);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const gameBoardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  useEffect(() => {
    try {
      localStorage.setItem('snake-high-scores', JSON.stringify(highScores));
    } catch {
      // ignore
    }
  }, [highScores]);

  const stopGameLoop = useCallback(() => {
    if (gameLoopRef.current !== null) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, []);

  const startGameLoop = useCallback(() => {
    stopGameLoop();
    const speed = SPEED_MAP[difficultyRef.current];
    gameLoopRef.current = window.setInterval(() => {
      if (gameStateRef.current !== 'playing') return;

      const currentSnake = snakeRef.current;
      const currentFood = foodRef.current;
      const dir = DIRECTION_MAP[directionRef.current];
      const head = currentSnake[0];
      const newHead: Position = {
        x: head.x + dir.x,
        y: head.y + dir.y,
      };

      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameState('gameover');
        stopGameLoop();
        return;
      }

      const bodyToCheck = currentSnake.slice(0, -1);
      if (bodyToCheck.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
        setGameState('gameover');
        stopGameLoop();
        return;
      }

      const ateFood = newHead.x === currentFood.x && newHead.y === currentFood.y;
      const newSnake = [newHead, ...currentSnake];

      if (!ateFood) {
        newSnake.pop();
      } else {
        const points = SCORE_MAP[difficultyRef.current];
        const newScore = scoreRef.current + points;
        setScore(newScore);
        scoreRef.current = newScore;

        setHighScores((prev) => {
          if (newScore > prev[difficultyRef.current]) {
            return { ...prev, [difficultyRef.current]: newScore };
          }
          return prev;
        });

        const newFood = getRandomPosition(newSnake);
        setFood(newFood);
        foodRef.current = newFood;
      }

      setSnake(newSnake);
      snakeRef.current = newSnake;
      lastDirectionRef.current = directionRef.current;
    }, speed);
  }, [stopGameLoop]);

  const startGame = useCallback(() => {
    const initialSnake = getInitialSnake();
    const initialFood = getRandomPosition(initialSnake);
    setSnake(initialSnake);
    snakeRef.current = initialSnake;
    setFood(initialFood);
    foodRef.current = initialFood;
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    lastDirectionRef.current = 'RIGHT';
    setScore(0);
    scoreRef.current = 0;
    setGameState('playing');

    setTimeout(() => {
      startGameLoop();
    }, 0);
  }, [startGameLoop]);

  const togglePause = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      setGameState('paused');
      stopGameLoop();
    } else if (gameStateRef.current === 'paused') {
      setGameState('playing');
      startGameLoop();
    }
  }, [startGameLoop, stopGameLoop]);

  const changeDirection = useCallback((newDir: Direction) => {
    if (gameStateRef.current !== 'playing') return;
    if (newDir === OPPOSITE[lastDirectionRef.current]) return;
    setDirection(newDir);
    directionRef.current = newDir;
  }, []);

  const changeDifficulty = useCallback(
    (d: Difficulty) => {
      setDifficulty(d);
      difficultyRef.current = d;
      if (gameStateRef.current === 'playing' || gameStateRef.current === 'paused') {
        stopGameLoop();
        const initialSnake = getInitialSnake();
        const initialFood = getRandomPosition(initialSnake);
        setSnake(initialSnake);
        snakeRef.current = initialSnake;
        setFood(initialFood);
        foodRef.current = initialFood;
        setScore(0);
        scoreRef.current = 0;
        setDirection('RIGHT');
        directionRef.current = 'RIGHT';
        lastDirectionRef.current = 'RIGHT';
        setGameState('idle');
      }
    },
    [stopGameLoop]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        w: 'UP',
        s: 'DOWN',
        a: 'LEFT',
        d: 'RIGHT',
        W: 'UP',
        S: 'DOWN',
        A: 'LEFT',
        D: 'RIGHT',
      };

      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        if (gameStateRef.current === 'idle' || gameStateRef.current === 'gameover') {
          startGame();
        }
        changeDirection(dir);
        return;
      }

      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        if (gameStateRef.current === 'playing' || gameStateRef.current === 'paused') {
          togglePause();
        }
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        startGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startGame, togglePause, changeDirection]);

  useEffect(() => {
    const board = gameBoardRef.current;
    if (!board) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (gameStateRef.current !== 'playing') return;
      const touch = e.touches[0];
      if (touch) {
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (gameStateRef.current !== 'playing' || !touchStartRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const minSwipeDistance = 30;

      if (Math.abs(dx) < minSwipeDistance && Math.abs(dy) < minSwipeDistance) {
        touchStartRef.current = null;
        return;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        changeDirection(dy > 0 ? 'DOWN' : 'UP');
      }
      touchStartRef.current = null;
    };

    board.addEventListener('touchstart', handleTouchStart, { passive: true });
    board.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      board.removeEventListener('touchstart', handleTouchStart);
      board.removeEventListener('touchend', handleTouchEnd);
    };
  }, [changeDirection]);

  useEffect(() => {
    return () => stopGameLoop();
  }, [stopGameLoop]);

  const gridCells = useMemo<GridCell[]>(() => {
    const cells: GridCell[] = [];
    const snakeSet = new Map<string, number>();
    snake.forEach((seg, i) => {
      snakeSet.set(`${seg.x},${seg.y}`, i);
    });

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const key = `${x},${y}`;
        const snakeIdx = snakeSet.get(key);
        if (snakeIdx !== undefined) {
          cells.push({
            key,
            type: snakeIdx === 0 ? 'snake-head' : 'snake-body',
            index: snakeIdx,
          });
        } else if (food.x === x && food.y === y) {
          cells.push({ key, type: 'food', index: -1 });
        } else {
          cells.push({ key, type: 'empty', index: -1 });
        }
      }
    }
    return cells;
  }, [snake, food]);

  const getHeadRotation = useCallback((): string => {
    switch (direction) {
      case 'UP':
        return 'rotate(-90deg)';
      case 'DOWN':
        return 'rotate(90deg)';
      case 'LEFT':
        return 'rotate(180deg)';
      case 'RIGHT':
        return 'rotate(0deg)';
      default:
        return 'rotate(0deg)';
    }
  }, [direction]);

  const handleDPad = useCallback(
    (dir: Direction) => {
      if (gameState === 'idle' || gameState === 'gameover') {
        startGame();
      }
      changeDirection(dir);
    },
    [gameState, startGame, changeDirection]
  );

  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 flex flex-col items-center justify-center p-3 md:p-4 select-none">
      <div className="w-full max-w-lg mb-3 md:mb-4">
        <h1 className="text-2xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 mb-3">
          🐍 Snake Game
        </h1>

        <div className="flex justify-between items-center px-4 mb-3">
          <div className="text-center">
            <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider font-medium">
              Score
            </div>
            <div className="text-xl md:text-2xl font-bold text-white tabular-nums">
              {score}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider font-medium mb-0.5">
              Difficulty
            </div>
            <div
              className={`text-xs md:text-sm font-bold px-3 py-0.5 rounded-full ${
                difficulty === 'easy'
                  ? 'text-green-400 bg-green-500/10'
                  : difficulty === 'medium'
                  ? 'text-yellow-400 bg-yellow-500/10'
                  : 'text-red-400 bg-red-500/10'
              }`}
            >
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider font-medium">
              Best
            </div>
            <div className="text-xl md:text-2xl font-bold text-yellow-400 tabular-nums">
              {highScores[difficulty]}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-2 mb-3">
          {difficulties.map((d) => (
            <button
              key={d}
              onClick={() => changeDifficulty(d)}
              className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200 ${
                difficulty === d
                  ? d === 'easy'
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                    : d === 'medium'
                    ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30'
                    : 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={gameBoardRef}
        className="relative w-full max-w-lg aspect-square rounded-2xl overflow-hidden border-2 border-gray-700/50 shadow-2xl shadow-black/50 bg-gray-800/80 backdrop-blur"
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`,
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            gap: '1px',
            padding: '2px',
          }}
        >
          {gridCells.map((cell) => {
            if (cell.type === 'empty') {
              return <div key={cell.key} className="rounded-[2px]" />;
            }
            if (cell.type === 'food') {
              return (
                <div key={cell.key} className="flex items-center justify-center">
                  <div className="w-[80%] h-[80%] rounded-full bg-red-500 shadow-lg shadow-red-500/60 animate-pulse" />
                </div>
              );
            }
            if (cell.type === 'snake-head') {
              return (
                <div key={cell.key} className="flex items-center justify-center">
                  <div
                    className="w-[92%] h-[92%] rounded-md bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/40 transition-transform duration-100 flex items-center justify-end pr-[12%]"
                    style={{ transform: getHeadRotation() }}
                  >
                    <div className="flex flex-col gap-[2px]">
                      <div className="w-[6px] h-[6px] md:w-[8px] md:h-[8px] rounded-full bg-white shadow-sm" />
                      <div className="w-[6px] h-[6px] md:w-[8px] md:h-[8px] rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                </div>
              );
            }
            const opacity = Math.max(0.4, 1 - cell.index * 0.025);
            return (
              <div key={cell.key} className="flex items-center justify-center">
                <div
                  className="w-[78%] h-[78%] rounded-[3px] bg-gradient-to-br from-green-500 to-emerald-600"
                  style={{ opacity }}
                />
              </div>
            );
          })}
        </div>

        {gameState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
            <div className="text-5xl md:text-6xl mb-4 animate-bounce">🐍</div>
            <p className="text-white text-lg md:text-xl font-medium mb-2">
              Ready to Play?
            </p>
            <p className="text-gray-300 text-xs md:text-sm mb-5 text-center px-4">
              Press any arrow key or tap Start
            </p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Start Game
            </button>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
            <div className="text-5xl md:text-6xl mb-4">⏸️</div>
            <p className="text-white text-xl md:text-2xl font-bold mb-4">Paused</p>
            <button
              onClick={togglePause}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Resume
            </button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-10">
            <div className="text-5xl md:text-6xl mb-3">💀</div>
            <p className="text-white text-2xl md:text-3xl font-bold mb-2">
              Game Over
            </p>
            <p className="text-gray-300 text-base md:text-lg mb-1">
              Score: <span className="text-green-400 font-bold">{score}</span>
            </p>
            {score > 0 && score >= highScores[difficulty] && (
              <p className="text-yellow-400 text-sm font-medium mb-2 animate-pulse">
                🏆 New High Score!
              </p>
            )}
            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 active:scale-95 transition-all duration-200 mt-3"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-lg mt-3 md:mt-4">
        <div className="flex justify-center gap-3 mb-4">
          {gameState === 'playing' && (
            <button
              onClick={togglePause}
              className="px-4 py-2 bg-gray-700/70 text-white text-sm rounded-lg hover:bg-gray-600 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>⏸️</span> Pause
            </button>
          )}
          {(gameState === 'playing' || gameState === 'paused') && (
            <button
              onClick={startGame}
              className="px-4 py-2 bg-gray-700/70 text-white text-sm rounded-lg hover:bg-gray-600 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>🔄</span> Restart
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5 md:hidden">
          <button
            onClick={() => handleDPad('UP')}
            className="w-14 h-14 bg-gray-700/80 rounded-xl flex items-center justify-center text-white text-xl active:bg-green-600 active:scale-90 transition-all border border-gray-600/50"
          >
            ▲
          </button>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleDPad('LEFT')}
              className="w-14 h-14 bg-gray-700/80 rounded-xl flex items-center justify-center text-white text-xl active:bg-green-600 active:scale-90 transition-all border border-gray-600/50"
            >
              ◀
            </button>
            <button
              onClick={() => handleDPad('DOWN')}
              className="w-14 h-14 bg-gray-700/80 rounded-xl flex items-center justify-center text-white text-xl active:bg-green-600 active:scale-90 transition-all border border-gray-600/50"
            >
              ▼
            </button>
            <button
              onClick={() => handleDPad('RIGHT')}
              className="w-14 h-14 bg-gray-700/80 rounded-xl flex items-center justify-center text-white text-xl active:bg-green-600 active:scale-90 transition-all border border-gray-600/50"
            >
              ▶
            </button>
          </div>
        </div>

        <div className="hidden md:flex justify-center text-center text-gray-400 text-xs mt-2 gap-4">
          <span className="px-2 py-1 bg-gray-800/50 rounded">← ↑ ↓ → Move</span>
          <span className="px-2 py-1 bg-gray-800/50 rounded">Space Pause</span>
          <span className="px-2 py-1 bg-gray-800/50 rounded">R Restart</span>
        </div>

        <div className="md:hidden text-center text-gray-400 text-xs mt-3">
          <p>Swipe on the board or use the D-pad to move</p>
        </div>
      </div>
    </div>
  );
}