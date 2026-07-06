import { useState, useEffect, useCallback, useRef } from "react";
import ChessGame from "./games/ChessGame";
import LaserAdventure from "./games/LaserAdventure";
import CardGames from "./games/CardGames";
import RadiationRunner from "./games/RadiationRunner";
import TerminalHacker from "./games/TerminalHacker";
import SnakeGame from "./games/SnakeGame";
import Tetris from "./games/Tetris";
import Game2048 from "./games/Game2048";
import Minesweeper from "./games/Minesweeper";
import { useApp } from "./context/AppContext";
import SettingsPanel from "./components/SettingsPanel";

type GameId = "menu" | "chess" | "laser" | "cards" | "runner" | "terminal" | "snake" | "tetris" | "2048" | "mines";

const GAMES = [
  {
    id: "chess" as GameId,
    nameKey: "game.chess.name",
    version: "v1.0",
    descKey: "game.chess.desc",
    tagKey: "game.chess.tag",
    colorOffset: 0,   // uses tc directly
  },
  {
    id: "laser" as GameId,
    nameKey: "game.laser.name",
    version: "v2.1",
    descKey: "game.laser.desc",
    tagKey: "game.laser.tag",
    colorOffset: 1,
  },
  {
    id: "cards" as GameId,
    nameKey: "game.cards.name",
    version: "v3.0",
    descKey: "game.cards.desc",
    tagKey: "game.cards.tag",
    colorOffset: 2,
  },
  {
    id: "runner" as GameId,
    nameKey: "game.runner.name",
    version: "v1.0",
    descKey: "game.runner.desc",
    tagKey: "game.runner.tag",
    colorOffset: 3,
  },
  {
    id: "terminal" as GameId,
    nameKey: "game.terminal.name",
    version: "v3.0",
    descKey: "game.terminal.desc",
    tagKey: "game.terminal.tag",
    colorOffset: 4,
  },
  {
    id: "snake" as GameId,
    nameKey: "game.snake.name",
    version: "v1.0",
    descKey: "game.snake.desc",
    tagKey: "game.snake.tag",
    colorOffset: 5,
  },
  {
    id: "tetris" as GameId,
    nameKey: "game.tetris.name",
    version: "v1.0",
    descKey: "game.tetris.desc",
    tagKey: "game.tetris.tag",
    colorOffset: 6,
  },
  {
    id: "2048" as GameId,
    nameKey: "game.2048.name",
    version: "v1.0",
    descKey: "game.2048.desc",
    tagKey: "game.2048.tag",
    colorOffset: 7,
  },
  {
    id: "mines" as GameId,
    nameKey: "game.mines.name",
    version: "v1.0",
    descKey: "game.mines.desc",
    tagKey: "game.mines.tag",
    colorOffset: 8,
  },
];

function BootScreen({ onDone }: { onDone: () => void }) {
  const { t } = useApp();
  const [lines, setLines] = useState<string[]>([]);
  const bootLinesRef = useRef<string[]>([
    "FERDREX GAME STUDIOS — ARCADE SYSTEM",
    "COPYRIGHT 2025 FERDREX GAME STUDIOS",
    " ",
    t("boot.init"),
    t("boot.memory"),
    t("boot.video"),
    t("boot.audio"),
    t("boot.modules"),
    t("boot.progress"),
    " ",
    t("boot.welcome"),
    t("boot.ready"),
  ]);

  useEffect(() => {
    const BOOT_LINES = bootLinesRef.current;
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        const line = BOOT_LINES[i] ?? " ";
        setLines(prev => [...prev, line]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(onDone, 600);
      }
    }, 60);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="font-mono text-green-400 text-sm max-w-lg w-full px-8">
        {lines.map((line, i) => (
          <div key={i} className={typeof line === "string" && (line.startsWith("WELCOME") || line.startsWith("BIENVENIDO")) ? "glow text-green-300" : ""}>
            {line && line.trim() ? line : "\u00A0"}
          </div>
        ))}
        <span className="cursor-blink">█</span>
      </div>
    </div>
  );
}

// Card accent colors per theme (4 variants per theme)
const CARD_COLORS: Record<string, string[]> = {
  green: ["#00FF00","#00FFCC","#AAFF44","#00FF88","#66FF00","#33FFAA","#88FF00","#00FFAA","#CCFF33"],
  amber: ["#FFC000","#FF9900","#FFD966","#FFAA33","#FFB800","#FFCC44","#FF8800","#FFDD22","#FFA500"],
  blue:  ["#00CCFF","#0088FF","#44DDFF","#00AACC","#33BBFF","#0099FF","#66CCFF","#00BBEE","#22AAFF"],
  red:   ["#FF4444","#FF6633","#FF4488","#FF8833","#FF5555","#FF7744","#FF3366","#FF9955","#FF6666"],
};

function MainMenu({ onSelect }: { onSelect: (id: GameId) => void }) {
  const { t, settings } = useApp();
  const [hoveredId, setHoveredId] = useState<GameId | null>(null);
  const [tick, setTick] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const tc = settings.theme === "amber" ? "#FFC000"
    : settings.theme === "blue" ? "#00CCFF"
    : settings.theme === "red" ? "#FF4444"
    : "#00FF00";

  const cardColors = CARD_COLORS[settings.theme] ?? CARD_COLORS.green;
  const dimBg = settings.theme === "amber" ? "rgba(60,30,0,0.35)"
    : settings.theme === "blue" ? "rgba(0,20,60,0.35)"
    : settings.theme === "red" ? "rgba(60,0,0,0.35)"
    : "rgba(0,30,0,0.35)";
  const dimBorder = settings.theme === "amber" ? "rgba(120,60,0,0.5)"
    : settings.theme === "blue" ? "rgba(0,60,120,0.5)"
    : settings.theme === "red" ? "rgba(120,0,0,0.5)"
    : "rgba(0,80,0,0.5)";
  const dimText = settings.theme === "amber" ? "rgba(255,180,0,0.6)"
    : settings.theme === "blue" ? "rgba(0,150,255,0.6)"
    : settings.theme === "red" ? "rgba(255,100,100,0.6)"
    : "rgba(0,200,0,0.6)";

  useEffect(() => {
    const timer = setInterval(() => setTick(p => p + 1), 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-xs tracking-[0.3em] mb-2" style={{ color: `${tc}99` }}>
          FERDREX GAME STUDIOS
        </div>
        <div
          className="text-4xl font-mono font-bold flicker"
          style={{ color: tc, textShadow: `0 0 20px ${tc}, 0 0 40px ${tc}, 0 0 60px ${tc}` }}
        >
          DREX ARCADE
        </div>
        <div className="text-xs mt-2 tracking-widest" style={{ color: `${tc}99` }}>
          {t("app.version")} v4.2.0
        </div>
        <div className="text-xs mt-1" style={{ color: `${tc}66` }}>
          {tick % 2 === 0 ? "▶" : "\u00A0"} {t("app.select")}
        </div>
      </div>

      {/* Decorative line */}
      <div className="w-full max-w-2xl h-px mb-8 opacity-50"
        style={{ background: `linear-gradient(to right, transparent, ${tc}, transparent)` }} />

      {/* Game cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {GAMES.map((game) => {
          const cc = cardColors[game.colorOffset] ?? tc;
          const hovered = hoveredId === game.id;
          return (
            <button
              key={game.id}
              onClick={() => onSelect(game.id)}
              onMouseEnter={() => setHoveredId(game.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="text-left p-5 transition-all duration-100"
              style={{
                background: hovered ? `${cc}14` : dimBg,
                border: `1px solid ${hovered ? cc : dimBorder}`,
                boxShadow: hovered ? `0 0 18px ${cc}44, inset 0 0 10px ${cc}0d` : "none",
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="text-lg font-mono font-bold"
                  style={{ color: cc, textShadow: hovered ? `0 0 10px ${cc}` : "none" }}>
                  {t(game.nameKey)}
                </div>
                <div className="text-xs" style={{ color: `${cc}66` }}>{game.version}</div>
              </div>
              <div className="text-xs mb-3 opacity-80" style={{ color: dimText }}>
                {t(game.descKey)}
              </div>
              <div className="text-xs font-mono"
                style={{ color: hovered ? cc : dimText }}>
                {hovered ? `▶ ${t("launch")} ${t(game.nameKey)}` : t(game.tagKey)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Settings button */}
      <div className="w-full max-w-2xl mt-6 flex justify-end">
        <button className="pipboy-btn text-xs" onClick={() => setShowSettings(true)}>
          ⚙ {t("menu.settings")}
        </button>
      </div>

      {/* Footer */}
      <div className="w-full max-w-2xl h-px mt-4 mb-4 opacity-50"
        style={{ background: `linear-gradient(to right, transparent, ${tc}, transparent)` }} />
      <div className="text-xs text-center tracking-widest" style={{ color: `${tc}44` }}>
        {t("app.dev")}
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default function App() {
  const [booted, setBooted] = useState(false);
  const [activeGame, setActiveGame] = useState<GameId>("menu");
  const { t, settings } = useApp();

  const tc = settings.theme === "amber" ? "#FFC000"
    : settings.theme === "blue" ? "#00CCFF"
    : settings.theme === "red" ? "#FF4444"
    : "#00FF00";

  const handleSelect = (id: GameId) => setActiveGame(id);
  const handleBack = () => setActiveGame("menu");
  const handleBooted = useCallback(() => setBooted(true), []);

  if (!booted) return <BootScreen onDone={handleBooted} />;

  return (
    <div className="min-h-screen relative">
      <div className="crt-overlay" style={{ pointerEvents: "none" }} />
      <div className="crt-vignette" style={{ pointerEvents: "none" }} />

      {activeGame === "menu" ? (
        <MainMenu onSelect={handleSelect} />
      ) : (
        <div className="min-h-screen flex flex-col">
          <div
            className="flex items-center gap-4 px-4 py-2"
            style={{ background: "rgba(0,0,0,0.6)", borderBottom: `1px solid ${tc}33` }}
          >
            <button className="pipboy-btn text-xs py-1 px-3" onClick={handleBack}>
              {t("menu.back")}
            </button>
            <div className="text-xs font-mono uppercase tracking-widest" style={{ color: `${tc}cc` }}>
              {t(GAMES.find(g => g.id === activeGame)?.nameKey ?? "")}
            </div>
            <div className="flex-1" />
            <div className="text-xs" style={{ color: `${tc}55` }}>DREX ARCADE // FERDREX GAME STUDIOS</div>
          </div>

          <div className="flex-1 overflow-auto">
            {activeGame === "chess" && <ChessGame />}
            {activeGame === "laser" && <LaserAdventure />}
            {activeGame === "cards" && <CardGames />}
            {activeGame === "runner" && <RadiationRunner />}
            {activeGame === "terminal" && <TerminalHacker />}
            {activeGame === "snake" && <SnakeGame />}
            {activeGame === "tetris" && <Tetris />}
            {activeGame === "2048" && <Game2048 />}
            {activeGame === "mines" && <Minesweeper />}
          </div>
        </div>
      )}
    </div>
  );
}
