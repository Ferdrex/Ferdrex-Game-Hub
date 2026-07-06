import { useEffect, useRef, useState, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { getHighScore, submitHighScore } from "../lib/highscore";

const SIZE = 4;
type Board = number[][];

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandom(b: Board): Board {
  const empties: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (b[r][c] === 0) empties.push([r, c]);
  if (empties.length === 0) return b;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  b[r][c] = Math.random() < 0.9 ? 2 : 4;
  return b;
}

function clone(b: Board): Board {
  return b.map(row => [...row]);
}

// Slide + merge one row to the left. Returns new row and points gained.
function slideRow(row: number[]): { row: number[]; gained: number } {
  const nums = row.filter(n => n !== 0);
  let gained = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i] === nums[i + 1]) {
      nums[i] *= 2;
      gained += nums[i];
      nums.splice(i + 1, 1);
    }
  }
  while (nums.length < SIZE) nums.push(0);
  return { row: nums, gained };
}

function rotateCW(b: Board): Board {
  const n: Board = emptyBoard();
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) n[c][SIZE - 1 - r] = b[r][c];
  return n;
}

function boardsEqual(a: Board, b: Board): boolean {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (a[r][c] !== b[r][c]) return false;
  return true;
}

// Move left after rotating `rot` times CW; then rotate back.
function move(b: Board, dir: "left" | "right" | "up" | "down"): { board: Board; gained: number; moved: boolean } {
  const rot = { left: 0, up: 3, right: 2, down: 1 }[dir];
  let work = clone(b);
  for (let i = 0; i < rot; i++) work = rotateCW(work);
  let gained = 0;
  work = work.map(row => { const r = slideRow(row); gained += r.gained; return r.row; });
  for (let i = 0; i < (4 - rot) % 4; i++) work = rotateCW(work);
  return { board: work, gained, moved: !boardsEqual(work, b) };
}

function canMove(b: Board): boolean {
  for (const d of ["left", "right", "up", "down"] as const) if (move(b, d).moved) return true;
  return false;
}

const TILE_COLORS: Record<number, string> = {
  2: "22", 4: "33", 8: "44", 16: "55", 32: "66", 64: "77",
  128: "88", 256: "99", 512: "aa", 1024: "bb", 2048: "ff",
};

export default function Game2048() {
  const { t, settings } = useApp();
  const tc = settings.theme === "amber" ? "#FFC000"
    : settings.theme === "blue" ? "#00CCFF"
    : settings.theme === "red" ? "#FF4444"
    : "#00FF00";

  const [board, setBoard] = useState<Board>(() => addRandom(addRandom(emptyBoard())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => getHighScore("2048"));
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const doMove = useCallback((dir: "left" | "right" | "up" | "down") => {
    setBoard(prev => {
      if (!canMove(prev)) return prev;
      const { board: moved, gained, moved: didMove } = move(prev, dir);
      if (!didMove) return prev;
      addRandom(moved);
      if (gained > 0) {
        setScore(s => {
          const ns = s + gained;
          submitHighScore("2048", ns, "max");
          setBest(getHighScore("2048"));
          return ns;
        });
      }
      if (moved.some(row => row.some(v => v === 2048))) setWon(true);
      if (!canMove(moved)) setOver(true);
      return moved;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
        ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
      };
      const dir = map[e.code];
      if (dir) { e.preventDefault(); doMove(dir); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  const newGame = () => {
    setBoard(addRandom(addRandom(emptyBoard())));
    setScore(0);
    setOver(false);
    setWon(false);
  };

  const onTouchStart = (e: React.PointerEvent) => { touchStart.current = { x: e.clientX, y: e.clientY }; };
  const onTouchEnd = (e: React.PointerEvent) => {
    const s = touchStart.current;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? "right" : "left");
    else doMove(dy > 0 ? "down" : "up");
    touchStart.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: `${tc}b0` }}>2048 v1.0</div>
        <div className="flex gap-6 justify-center text-sm">
          <span className="glow" style={{ color: tc }}>{t("sol.score")}: {score}</span>
          <span style={{ color: `${tc}88` }}>{t("record.best")}: {best}</span>
        </div>
      </div>

      <div
        className="relative pipboy-border p-2"
        style={{ touchAction: "none" }}
        onPointerDown={onTouchStart}
        onPointerUp={onTouchEnd}
      >
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
          {board.flatMap((row, r) => row.map((v, c) => (
            <div
              key={`${r}-${c}`}
              className="flex items-center justify-center font-mono font-bold"
              style={{
                width: "clamp(52px, 18vw, 72px)",
                height: "clamp(52px, 18vw, 72px)",
                fontSize: v >= 1024 ? "1.1rem" : "1.5rem",
                background: v === 0 ? `${tc}0a` : `${tc}${TILE_COLORS[v] ?? "ff"}`,
                border: `1px solid ${v === 0 ? `${tc}22` : tc}`,
                color: v === 0 ? "transparent" : (v >= 8 ? "#020a02" : tc),
                textShadow: v >= 8 ? "none" : `0 0 6px ${tc}`,
                boxShadow: v >= 128 ? `0 0 10px ${tc}66` : "none",
              }}
            >
              {v !== 0 ? v : ""}
            </div>
          )))}
        </div>

        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85">
            <div className="glow-red text-red-400 text-2xl mb-2 font-mono">{t("g2048.over")}</div>
            <div className="text-sm mb-4" style={{ color: tc }}>{t("sol.score")}: {score}</div>
            <button className="pipboy-btn" onClick={newGame}>{t("g2048.new")}</button>
          </div>
        )}
        {won && !over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85">
            <div className="glow text-2xl mb-2 font-mono flicker" style={{ color: tc }}>2048!</div>
            <div className="text-xs mb-4" style={{ color: `${tc}cc` }}>{t("g2048.keep")}</div>
            <div className="flex gap-2">
              <button className="pipboy-btn" onClick={() => setWon(false)}>{t("g2048.continue")}</button>
              <button className="pipboy-btn" onClick={newGame}>{t("g2048.new")}</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button className="pipboy-btn text-xs" onClick={newGame}>{t("g2048.new")}</button>
      </div>
      <div className="text-xs text-center" style={{ color: `${tc}88` }}>{t("g2048.controls")}</div>
    </div>
  );
}
