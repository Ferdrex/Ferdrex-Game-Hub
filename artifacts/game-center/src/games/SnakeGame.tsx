import { useEffect, useRef, useState, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { getHighScore, submitHighScore } from "../lib/highscore";

const CELL = 20;
const GRID = 20;
const CANVAS = CELL * GRID; // 400x400
const TICK_MS = 110;

type Pt = { x: number; y: number };

export default function SnakeGame() {
  const { t, settings } = useApp();
  const tc = settings.theme === "amber" ? "#FFC000"
    : settings.theme === "blue" ? "#00CCFF"
    : settings.theme === "red" ? "#FF4444"
    : "#00FF00";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gs = useRef({
    snake: [{ x: 10, y: 10 }] as Pt[],
    dir: { x: 1, y: 0 } as Pt,
    nextDir: { x: 1, y: 0 } as Pt,
    food: { x: 15, y: 10 } as Pt,
    score: 0,
    running: false,
    gameOver: false,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStart = useRef<Pt | null>(null);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => getHighScore("snake"));
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [newRecord, setNewRecord] = useState(false);

  const placeFood = () => {
    const g = gs.current;
    let f: Pt;
    do {
      f = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (g.snake.some(s => s.x === f.x && s.y === f.y));
    g.food = f;
  };

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const g = gs.current;
    // Background
    ctx.fillStyle = "#020a02";
    ctx.fillRect(0, 0, CANVAS, CANVAS);
    // Grid lines
    ctx.strokeStyle = `${tc}12`;
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, CANVAS); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(CANVAS, i * CELL); ctx.stroke();
    }
    // Food
    ctx.fillStyle = "#FF4444";
    ctx.shadowColor = "#FF4444";
    ctx.shadowBlur = 10;
    ctx.fillRect(g.food.x * CELL + 3, g.food.y * CELL + 3, CELL - 6, CELL - 6);
    ctx.shadowBlur = 0;
    // Snake
    g.snake.forEach((s, i) => {
      ctx.fillStyle = tc;
      ctx.shadowColor = tc;
      ctx.shadowBlur = i === 0 ? 12 : 4;
      ctx.fillRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4);
    });
    ctx.shadowBlur = 0;
  }, [tc]);

  const step = useCallback(() => {
    const g = gs.current;
    if (!g.running || g.gameOver) return;
    g.dir = g.nextDir;
    const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
    // Wall or self collision
    if (
      head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID ||
      g.snake.some(s => s.x === head.x && s.y === head.y)
    ) {
      g.running = false;
      g.gameOver = true;
      const isRec = submitHighScore("snake", g.score, "max");
      setBest(getHighScore("snake"));
      setNewRecord(isRec);
      setGameOver(true);
      if (timerRef.current) clearInterval(timerRef.current);
      draw();
      return;
    }
    g.snake.unshift(head);
    if (head.x === g.food.x && head.y === g.food.y) {
      g.score++;
      setScore(g.score);
      placeFood();
    } else {
      g.snake.pop();
    }
    draw();
  }, [draw]);

  const setDir = useCallback((x: number, y: number) => {
    const g = gs.current;
    // Prevent reversing directly onto itself
    if (g.dir.x === -x && g.dir.y === -y) return;
    g.nextDir = { x, y };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp": case "KeyW": setDir(0, -1); break;
        case "ArrowDown": case "KeyS": setDir(0, 1); break;
        case "ArrowLeft": case "KeyA": setDir(-1, 0); break;
        case "ArrowRight": case "KeyD": setDir(1, 0); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDir]);

  const startGame = () => {
    const g = gs.current;
    g.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    g.dir = { x: 1, y: 0 };
    g.nextDir = { x: 1, y: 0 };
    g.score = 0;
    g.running = true;
    g.gameOver = false;
    placeFood();
    setScore(0);
    setGameOver(false);
    setNewRecord(false);
    setStarted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(step, TICK_MS);
    draw();
  };

  useEffect(() => {
    draw();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [draw]);

  // Swipe controls for mobile
  const onPointerDown = (e: React.PointerEvent) => {
    touchStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = touchStart.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
    else setDir(0, dy > 0 ? 1 : -1);
    touchStart.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: `${tc}b0` }}>Snake v1.0</div>
        <div className="glow text-sm" style={{ color: tc }}>{t("sol.score")}: {score}</div>
        <div className="text-xs mt-1" style={{ color: `${tc}88` }}>{t("record.best")}: {best}</div>
      </div>

      <div className="relative pipboy-border">
        <canvas
          ref={canvasRef}
          width={CANVAS}
          height={CANVAS}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          style={{ display: "block", background: "#020a02", touchAction: "none" }}
        />
        {!started && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <div className="glow text-2xl mb-4 font-mono" style={{ color: tc }}>SNAKE</div>
            <button className="pipboy-btn" onClick={startGame}>{t("snake.start")}</button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <div className="glow-red text-red-400 text-2xl mb-2 font-mono">{t("snake.over")}</div>
            <div className="text-sm mb-1" style={{ color: tc }}>{t("sol.score")}: {score}</div>
            {newRecord
              ? <div className="glow text-sm mb-4 flicker" style={{ color: tc }}>★ {t("record.new")} ★</div>
              : <div className="text-xs mb-4" style={{ color: `${tc}88` }}>{t("record.best")}: {best}</div>}
            <button className="pipboy-btn" onClick={startGame}>{t("snake.retry")}</button>
          </div>
        )}
      </div>

      {/* On-screen D-pad */}
      <div className="flex flex-col items-center gap-2">
        <button className="pipboy-btn dpad-btn"
          onPointerDown={(e) => { e.preventDefault(); setDir(0, -1); }} style={{ touchAction: "none" }}>▲</button>
        <div className="flex gap-2">
          <button className="pipboy-btn dpad-btn"
            onPointerDown={(e) => { e.preventDefault(); setDir(-1, 0); }} style={{ touchAction: "none" }}>◀</button>
          <button className="pipboy-btn dpad-btn"
            onPointerDown={(e) => { e.preventDefault(); setDir(0, 1); }} style={{ touchAction: "none" }}>▼</button>
          <button className="pipboy-btn dpad-btn"
            onPointerDown={(e) => { e.preventDefault(); setDir(1, 0); }} style={{ touchAction: "none" }}>▶</button>
        </div>
      </div>

      <div className="text-xs text-center" style={{ color: `${tc}88` }}>
        {t("snake.controls")}
      </div>
    </div>
  );
}
