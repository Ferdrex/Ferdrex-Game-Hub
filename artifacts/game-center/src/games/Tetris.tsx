import { useEffect, useRef, useState, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { getHighScore, submitHighScore } from "../lib/highscore";

const COLS = 10;
const ROWS = 20;
const CELL = 18;
const CANVAS_W = COLS * CELL; // 180
const CANVAS_H = ROWS * CELL; // 360

type Matrix = number[][];

const SHAPES: Matrix[] = [
  [[1, 1, 1, 1]],           // I
  [[1, 1], [1, 1]],         // O
  [[0, 1, 0], [1, 1, 1]],   // T
  [[0, 1, 1], [1, 1, 0]],   // S
  [[1, 1, 0], [0, 1, 1]],   // Z
  [[1, 0, 0], [1, 1, 1]],   // J
  [[0, 0, 1], [1, 1, 1]],   // L
];

function rotateCW(m: Matrix): Matrix {
  const rows = m.length, cols = m[0].length;
  const r: Matrix = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) r[x][rows - 1 - y] = m[y][x];
  return r;
}

function emptyBoard(): number[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

type Piece = { shape: Matrix; x: number; y: number };

function randomPiece(): Piece {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return { shape, x: Math.floor((COLS - shape[0].length) / 2), y: 0 };
}

export default function Tetris() {
  const { t, settings } = useApp();
  const tc = settings.theme === "amber" ? "#FFC000"
    : settings.theme === "blue" ? "#00CCFF"
    : settings.theme === "red" ? "#FF4444"
    : "#00FF00";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gs = useRef({
    board: emptyBoard(),
    piece: randomPiece(),
    dropAccum: 0,
    dropInterval: 800,
    lastTime: 0,
    running: false,
    gameOver: false,
    score: 0,
    lines: 0,
  });
  const rafRef = useRef<number>(0);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => getHighScore("tetris"));
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [newRecord, setNewRecord] = useState(false);

  const collides = (board: number[][], shape: Matrix, px: number, py: number): boolean => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const nx = px + x, ny = py + y;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  };

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const g = gs.current;
    ctx.fillStyle = "#020a02";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // grid
    ctx.strokeStyle = `${tc}10`;
    for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, CANVAS_H); ctx.stroke(); }
    for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(CANVAS_W, y * CELL); ctx.stroke(); }
    const cell = (x: number, y: number, bright: boolean) => {
      ctx.fillStyle = tc;
      ctx.globalAlpha = bright ? 1 : 0.7;
      ctx.shadowColor = tc;
      ctx.shadowBlur = bright ? 8 : 2;
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };
    // locked
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (g.board[y][x]) cell(x, y, false);
    // active
    const p = g.piece;
    for (let y = 0; y < p.shape.length; y++) for (let x = 0; x < p.shape[y].length; x++) if (p.shape[y][x] && p.y + y >= 0) cell(p.x + x, p.y + y, true);
  }, [tc]);

  const lockAndNext = useCallback(() => {
    const g = gs.current;
    const p = g.piece;
    p.shape.forEach((row, y) => row.forEach((v, x) => { if (v && p.y + y >= 0) g.board[p.y + y][p.x + x] = 1; }));
    // clear full lines
    let cleared = 0;
    g.board = g.board.filter(row => {
      if (row.every(v => v)) { cleared++; return false; }
      return true;
    });
    while (g.board.length < ROWS) g.board.unshift(Array(COLS).fill(0));
    if (cleared > 0) {
      g.lines += cleared;
      g.score += [0, 40, 100, 300, 1200][cleared];
      setScore(g.score);
      g.dropInterval = Math.max(120, 800 - g.lines * 20);
    }
    // spawn
    g.piece = randomPiece();
    if (collides(g.board, g.piece.shape, g.piece.x, g.piece.y)) {
      g.running = false;
      g.gameOver = true;
      const isRec = submitHighScore("tetris", g.score, "max");
      setBest(getHighScore("tetris"));
      setNewRecord(isRec);
      setGameOver(true);
    }
  }, []);

  const softDrop = useCallback(() => {
    const g = gs.current;
    if (!collides(g.board, g.piece.shape, g.piece.x, g.piece.y + 1)) g.piece.y++;
    else lockAndNext();
  }, [lockAndNext]);

  const move = useCallback((dx: number) => {
    const g = gs.current;
    if (!g.running) return;
    if (!collides(g.board, g.piece.shape, g.piece.x + dx, g.piece.y)) { g.piece.x += dx; draw(); }
  }, [draw]);

  const rotate = useCallback(() => {
    const g = gs.current;
    if (!g.running) return;
    const r = rotateCW(g.piece.shape);
    // simple wall kick: try offsets 0, -1, +1, -2, +2
    for (const off of [0, -1, 1, -2, 2]) {
      if (!collides(g.board, r, g.piece.x + off, g.piece.y)) { g.piece.shape = r; g.piece.x += off; draw(); return; }
    }
  }, [draw]);

  const hardDrop = useCallback(() => {
    const g = gs.current;
    if (!g.running) return;
    while (!collides(g.board, g.piece.shape, g.piece.x, g.piece.y + 1)) g.piece.y++;
    lockAndNext();
    draw();
  }, [lockAndNext, draw]);

  const loop = useCallback((time: number) => {
    const g = gs.current;
    if (!g.running) return;
    if (!g.lastTime) g.lastTime = time;
    const delta = time - g.lastTime;
    g.lastTime = time;
    g.dropAccum += delta;
    if (g.dropAccum >= g.dropInterval) { softDrop(); g.dropAccum = 0; }
    draw();
    if (g.running) rafRef.current = requestAnimationFrame(loop);
  }, [softDrop, draw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!gs.current.running) return;
      switch (e.code) {
        case "ArrowLeft": case "KeyA": e.preventDefault(); move(-1); break;
        case "ArrowRight": case "KeyD": e.preventDefault(); move(1); break;
        case "ArrowDown": case "KeyS": e.preventDefault(); softDrop(); draw(); break;
        case "ArrowUp": case "KeyW": e.preventDefault(); rotate(); break;
        case "Space": e.preventDefault(); hardDrop(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, softDrop, rotate, hardDrop, draw]);

  const startGame = () => {
    const g = gs.current;
    g.board = emptyBoard();
    g.piece = randomPiece();
    g.dropAccum = 0;
    g.dropInterval = 800;
    g.lastTime = 0;
    g.running = true;
    g.gameOver = false;
    g.score = 0;
    g.lines = 0;
    setScore(0);
    setGameOver(false);
    setNewRecord(false);
    setStarted(true);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const TouchBtn = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <button
      className="pipboy-btn text-lg py-3 flex-1"
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      style={{ touchAction: "none" }}
    >{label}</button>
  );

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: `${tc}b0` }}>Tetris v1.0</div>
        <div className="flex gap-6 justify-center text-sm">
          <span className="glow" style={{ color: tc }}>{t("sol.score")}: {score}</span>
          <span style={{ color: `${tc}88` }}>{t("record.best")}: {best}</span>
        </div>
      </div>

      <div className="relative pipboy-border">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: "block", background: "#020a02" }}
        />
        {!started && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <div className="glow text-2xl mb-4 font-mono" style={{ color: tc }}>TETRIS</div>
            <button className="pipboy-btn" onClick={startGame}>{t("tetris.start")}</button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <div className="glow-red text-red-400 text-2xl mb-2 font-mono">{t("tetris.over")}</div>
            <div className="text-sm mb-1" style={{ color: tc }}>{t("sol.score")}: {score}</div>
            {newRecord
              ? <div className="glow text-sm mb-4 flicker" style={{ color: tc }}>★ {t("record.new")} ★</div>
              : <div className="text-xs mb-4" style={{ color: `${tc}88` }}>{t("record.best")}: {best}</div>}
            <button className="pipboy-btn" onClick={startGame}>{t("tetris.retry")}</button>
          </div>
        )}
      </div>

      {/* Touch controls */}
      <div className="w-full max-w-[240px] flex flex-col gap-2">
        <div className="flex gap-2">
          <TouchBtn label="◀" onPress={() => move(-1)} />
          <TouchBtn label="⟳" onPress={rotate} />
          <TouchBtn label="▶" onPress={() => move(1)} />
        </div>
        <div className="flex gap-2">
          <TouchBtn label="▼" onPress={() => { softDrop(); draw(); }} />
          <TouchBtn label="⤓" onPress={hardDrop} />
        </div>
      </div>

      <div className="text-xs text-center" style={{ color: `${tc}88` }}>{t("tetris.controls")}</div>
    </div>
  );
}
