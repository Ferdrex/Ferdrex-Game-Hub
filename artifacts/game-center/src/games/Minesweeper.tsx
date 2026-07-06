import { useEffect, useRef, useState, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { getHighScore, submitHighScore } from "../lib/highscore";

const ROWS = 9;
const COLS = 9;
const MINES = 10;

type Cell = { mine: boolean; revealed: boolean; flagged: boolean; adj: number };

function makeGrid(): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 }))
  );
}

function placeMines(grid: Cell[][], safeR: number, safeC: number) {
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (grid[r][c].mine) continue;
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue; // keep first click area clear
    grid[r][c].mine = true;
    placed++;
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].mine) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc].mine) n++;
      }
      grid[r][c].adj = n;
    }
  }
}

function floodReveal(grid: Cell[][], r: number, c: number) {
  const stack: [number, number][] = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop()!;
    const cell = grid[cr][cc];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adj === 0 && !cell.mine) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = cr + dr, nc = cc + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !grid[nr][nc].revealed) stack.push([nr, nc]);
      }
    }
  }
}

const NUM_COLORS: Record<number, string> = {
  1: "#00CCFF", 2: "#00FF88", 3: "#FFC000", 4: "#FF8833", 5: "#FF4444", 6: "#FF44AA", 7: "#CC88FF", 8: "#FFFFFF",
};

export default function Minesweeper() {
  const { t, settings } = useApp();
  const tc = settings.theme === "amber" ? "#FFC000"
    : settings.theme === "blue" ? "#00CCFF"
    : settings.theme === "red" ? "#FF4444"
    : "#00FF00";

  const [grid, setGrid] = useState<Cell[][]>(makeGrid);
  const [state, setState] = useState<"ready" | "playing" | "won" | "lost">("ready");
  const [flags, setFlags] = useState(0);
  const [time, setTime] = useState(0);
  const [best, setBest] = useState(() => getHighScore("minesweeper"));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  useEffect(() => () => stopTimer(), []);

  const reset = () => {
    stopTimer();
    setGrid(makeGrid());
    setState("ready");
    setFlags(0);
    setTime(0);
  };

  const checkWin = (g: Cell[][]) => {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!g[r][c].mine && !g[r][c].revealed) return false;
    }
    return true;
  };

  const reveal = useCallback((r: number, c: number) => {
    if (didLongPress.current) { didLongPress.current = false; return; }
    setGrid(prev => {
      if (state === "won" || state === "lost") return prev;
      const g = prev.map(row => row.map(cell => ({ ...cell })));
      if (g[r][c].flagged || g[r][c].revealed) return prev;

      let curState = state;
      if (curState === "ready") {
        placeMines(g, r, c);
        curState = "playing";
        setState("playing");
        setTime(0);
        stopTimer();
        timerRef.current = setInterval(() => setTime(tt => tt + 1), 1000);
      }

      if (g[r][c].mine) {
        g.forEach(row => row.forEach(cell => { if (cell.mine) cell.revealed = true; }));
        setState("lost");
        stopTimer();
        return g;
      }

      floodReveal(g, r, c);
      if (checkWin(g)) {
        setState("won");
        stopTimer();
        setTime(tv => {
          const isRec = submitHighScore("minesweeper", tv, "min");
          setBest(getHighScore("minesweeper"));
          if (isRec) { /* new best time */ }
          return tv;
        });
      }
      return g;
    });
  }, [state]);

  const toggleFlag = useCallback((r: number, c: number) => {
    setGrid(prev => {
      if (state === "won" || state === "lost" || state === "ready") return prev;
      const g = prev.map(row => row.map(cell => ({ ...cell })));
      if (g[r][c].revealed) return prev;
      g[r][c].flagged = !g[r][c].flagged;
      setFlags(f => f + (g[r][c].flagged ? 1 : -1));
      return g;
    });
  }, [state]);

  const onContextMenu = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    toggleFlag(r, c);
  };

  // Long-press to flag on touch
  const onPointerDown = (r: number, c: number) => {
    didLongPress.current = false;
    longPress.current = setTimeout(() => { didLongPress.current = true; toggleFlag(r, c); }, 350);
  };
  const clearLongPress = () => { if (longPress.current) { clearTimeout(longPress.current); longPress.current = null; } };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: `${tc}b0` }}>Minesweeper v1.0</div>
        <div className="flex gap-6 justify-center text-sm">
          <span style={{ color: tc }}>💣 {MINES - flags}</span>
          <span className="glow" style={{ color: tc }}>⏱ {time}s</span>
          <span style={{ color: `${tc}88` }}>{t("record.best")}: {best > 0 ? best + "s" : "—"}</span>
        </div>
      </div>

      <div className="relative pipboy-border p-2" style={{ touchAction: "manipulation" }}>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {grid.flatMap((row, r) => row.map((cell, c) => {
            const size = "clamp(28px, 9vw, 40px)";
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => reveal(r, c)}
                onContextMenu={(e) => onContextMenu(e, r, c)}
                onPointerDown={() => onPointerDown(r, c)}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
                className="flex items-center justify-center font-mono font-bold select-none"
                style={{
                  width: size, height: size, fontSize: "0.9rem",
                  background: cell.revealed ? `${tc}0a` : `${tc}1e`,
                  border: `1px solid ${cell.revealed ? `${tc}22` : `${tc}55`}`,
                  color: cell.mine && cell.revealed ? "#FF4444" : NUM_COLORS[cell.adj] ?? tc,
                  cursor: "pointer",
                }}
              >
                {cell.flagged && !cell.revealed ? "🚩"
                  : !cell.revealed ? ""
                  : cell.mine ? "💥"
                  : cell.adj > 0 ? cell.adj : ""}
              </button>
            );
          }))}
        </div>

        {(state === "won" || state === "lost") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85">
            {state === "won"
              ? <div className="glow text-2xl mb-2 font-mono flicker" style={{ color: tc }}>{t("mine.win")}</div>
              : <div className="glow-red text-red-400 text-2xl mb-2 font-mono">{t("mine.boom")}</div>}
            <div className="text-sm mb-4" style={{ color: tc }}>⏱ {time}s</div>
            <button className="pipboy-btn" onClick={reset}>{t("mine.new")}</button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button className="pipboy-btn text-xs" onClick={reset}>{t("mine.new")}</button>
      </div>
      <div className="text-xs text-center" style={{ color: `${tc}88` }}>{t("mine.controls")}</div>
    </div>
  );
}
