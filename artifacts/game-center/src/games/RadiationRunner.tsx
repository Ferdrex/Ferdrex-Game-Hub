import { useEffect, useRef, useState, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { getHighScore, submitHighScore } from "../lib/highscore";
import Leaderboard from "../components/Leaderboard";

const CANVAS_W = 600;
const CANVAS_H = 300;
const GROUND_Y = 250;
const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const SCROLL_SPEED_BASE = 4;

type Obstacle = { x: number; y: number; w: number; h: number; type: "barrel"|"spike"|"crate" };
type Cloud = { x: number; y: number; speed: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number };

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, isJumping: boolean, tick: number) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  const legCycle = isJumping ? 0 : Math.sin(tick * 0.25) * 4;

  // Body
  ctx.fillStyle = "#2a5c2a";
  ctx.fillRect(px + 6, py + 14, 14, 14);

  // Head
  ctx.fillStyle = "#3d8c3d";
  ctx.fillRect(px + 5, py + 6, 16, 10);

  // Pip-Boy on wrist (left arm)
  ctx.fillStyle = "#00aa55";
  ctx.fillRect(px + 1, py + 16, 6, 5);
  ctx.fillStyle = "#00ff88";
  ctx.fillRect(px + 2, py + 17, 4, 3);
  ctx.shadowColor = "#00ff88";
  ctx.shadowBlur = 4;
  ctx.fillRect(px + 2, py + 17, 4, 3);
  ctx.shadowBlur = 0;

  // Visor
  ctx.fillStyle = "#00ffaa";
  ctx.shadowColor = "#00ffaa";
  ctx.shadowBlur = 6;
  ctx.fillRect(px + 7, py + 8, 10, 4);
  ctx.shadowBlur = 0;

  // Legs
  ctx.fillStyle = "#1a3d1a";
  ctx.fillRect(px + 7, py + 26, 5, 8 + legCycle);
  ctx.fillRect(px + 13, py + 26, 5, 8 - legCycle);

  // Boots
  ctx.fillStyle = "#333";
  ctx.fillRect(px + 6, py + 32 + legCycle, 7, 3);
  ctx.fillRect(px + 12, py + 32 - legCycle, 7, 3);
}

function drawBarrel(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  const glow = Math.sin(tick * 0.08) * 0.5 + 0.5;

  // Barrel body
  ctx.fillStyle = "#4a3000";
  ctx.fillRect(px + 2, py + 4, 28, 32);

  // Barrel top/bottom
  ctx.fillStyle = "#6a4400";
  ctx.fillRect(px, py + 2, 32, 6);
  ctx.fillRect(px, py + 30, 32, 6);

  // Metal bands
  ctx.fillStyle = "#888";
  ctx.fillRect(px, py + 14, 32, 3);
  ctx.fillRect(px, py + 21, 32, 3);

  // Radioactive glow
  ctx.fillStyle = `rgba(0, 255, 0, ${0.6 + glow * 0.4})`;
  ctx.shadowColor = "#00FF00";
  ctx.shadowBlur = 8 + glow * 8;

  // Radiation symbol (simplified)
  ctx.beginPath();
  ctx.arc(px + 16, py + 17, 7, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,255,0,${0.15 + glow * 0.1})`;
  ctx.fill();

  ctx.fillStyle = `rgba(0,255,0,${0.8 + glow * 0.2})`;
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 * i / 3) - Math.PI / 2;
    const bx = px + 16 + Math.cos(angle) * 4;
    const by = py + 17 + Math.sin(angle) * 4;
    ctx.fillRect(bx - 1, by - 1, 3, 3);
  }
  ctx.shadowBlur = 0;

  // Liquid drip
  ctx.fillStyle = `rgba(0,200,0,${0.5 + glow * 0.5})`;
  ctx.fillRect(px + 10 + Math.floor(glow * 2), py + 36, 2, 2 + Math.floor(glow * 3));
}

function drawSpike(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  ctx.fillStyle = "#888888";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(px + i * 12, py + 36);
    ctx.lineTo(px + i * 12 + 6, py);
    ctx.lineTo(px + i * 12 + 12, py + 36);
    ctx.fill();
  }
  ctx.strokeStyle = "#aaaaaa";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(px + i * 12, py + 36);
    ctx.lineTo(px + i * 12 + 6, py);
    ctx.lineTo(px + i * 12 + 12, py + 36);
    ctx.stroke();
  }
}

function drawCrate(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  ctx.fillStyle = "#5c3a00";
  ctx.fillRect(px, py, 32, 32);
  ctx.strokeStyle = "#8B5E00";
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 1, 30, 30);
  // Cross braces
  ctx.beginPath();
  ctx.moveTo(px, py); ctx.lineTo(px + 32, py + 32);
  ctx.moveTo(px + 32, py); ctx.lineTo(px, py + 32);
  ctx.stroke();
  // BIOHAZARD text
  ctx.fillStyle = "#ffaa00";
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "center";
  ctx.fillText("RAD", px + 16, py + 14);
  ctx.fillText("BOX", px + 16, py + 24);
  ctx.textAlign = "left";
}

export default function RadiationRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef({
    playerY: GROUND_Y - 36,
    playerVY: 0,
    isJumping: false,
    obstacles: [] as Obstacle[],
    clouds: [] as Cloud[],
    particles: [] as Particle[],
    scrollSpeed: SCROLL_SPEED_BASE,
    score: 0,
    tick: 0,
    running: false,
    gameOver: false,
    spawnTimer: 0,
    keys: {} as Record<string, boolean>,
    bgX: 0,
    radsAccum: 0,
  });
  const animRef = useRef<number>(0);
  const { t } = useApp();
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [best, setBest] = useState(() => getHighScore("runner"));
  const [newRecord, setNewRecord] = useState(false);
  const [showLb, setShowLb] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      gsRef.current.keys[e.code] = e.type === "keydown";
      if ((e.code === "Space" || e.code === "ArrowUp") && e.type === "keydown") {
        const gs = gsRef.current;
        if (!gs.isJumping && gs.running && !gs.gameOver) {
          gs.playerVY = JUMP_FORCE;
          gs.isJumping = true;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey); };
  }, []);

  const spawnObstacle = () => {
    const gs = gsRef.current;
    const types: Obstacle["type"][] = ["barrel", "barrel", "spike", "crate"];
    const type = types[Math.floor(Math.random() * types.length)];
    const w = type === "spike" ? 36 : 32;
    const h = type === "spike" ? 36 : 32;
    gs.obstacles.push({ x: CANVAS_W + 20, y: GROUND_Y - h, w, h, type });
  };

  const gameLoop = useCallback(() => {
    const gs = gsRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !gs.running) return;
    const ctx = canvas.getContext("2d")!;
    gs.tick++;

    if (!gs.gameOver) {
      // Physics
      gs.playerVY += GRAVITY;
      gs.playerY += gs.playerVY;
      if (gs.playerY >= GROUND_Y - 36) {
        gs.playerY = GROUND_Y - 36;
        gs.playerVY = 0;
        gs.isJumping = false;
      }

      // Touch jump
      if ((gs.keys["Space"] || gs.keys["ArrowUp"]) && !gs.isJumping) {
        gs.playerVY = JUMP_FORCE;
        gs.isJumping = true;
      }

      // Scroll speed increases over time
      gs.scrollSpeed = SCROLL_SPEED_BASE + gs.score * 0.01;
      gs.bgX = (gs.bgX - gs.scrollSpeed * 0.5 + CANVAS_W * 2) % (CANVAS_W * 2);

      // Spawn obstacles
      gs.spawnTimer += gs.scrollSpeed;
      const spawnInterval = 200 - Math.min(gs.score * 0.5, 100);
      if (gs.spawnTimer >= spawnInterval) {
        spawnObstacle();
        gs.spawnTimer = 0;
      }

      // Move obstacles
      gs.obstacles.forEach(o => { o.x -= gs.scrollSpeed; });
      gs.obstacles = gs.obstacles.filter(o => o.x > -80);

      // Spawn clouds
      if (gs.tick % 120 === 0) {
        gs.clouds.push({ x: CANVAS_W + 100, y: 30 + Math.random() * 80, speed: 0.5 + Math.random() });
      }
      gs.clouds.forEach(c => { c.x -= c.speed; });
      gs.clouds = gs.clouds.filter(c => c.x > -100);

      // Score
      gs.score++;
      if (gs.tick % 6 === 0) setScore(gs.score);

      // Collision
      const px = 40, py = gs.playerY, pw = 22, ph = 32;
      for (const o of gs.obstacles) {
        if (px + 2 < o.x + o.w - 2 && px + pw - 2 > o.x + 2 && py + 2 < o.y + o.h - 2 && py + ph - 2 > o.y + 2) {
          // Explosion particles
          for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 2 * i) / 16;
            gs.particles.push({ x: px + pw/2, y: py + ph/2, vx: Math.cos(angle) * (2 + Math.random() * 3), vy: Math.sin(angle) * (2 + Math.random() * 3), life: 40, maxLife: 40 });
          }
          gs.gameOver = true;
          gs.running = false;
          const isRec = submitHighScore("runner", gs.score, "max");
          setBest(getHighScore("runner"));
          setNewRecord(isRec);
          setGameOver(true);
          break;
        }
      }

      // Particles
      gs.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--; });
      gs.particles = gs.particles.filter(p => p.life > 0);
    }

    // ---- DRAW ----
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    skyGrad.addColorStop(0, "#020a02");
    skyGrad.addColorStop(1, "#041504");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Scrolling background ruins
    ctx.fillStyle = "rgba(0,80,0,0.12)";
    for (let i = 0; i < 6; i++) {
      const bx = ((i * 200 - gs.bgX * 0.3) + CANVAS_W * 3) % (CANVAS_W + 300);
      const bh = 40 + (i * 23) % 60;
      ctx.fillRect(bx, GROUND_Y - bh - 10, 30, bh);
      ctx.fillRect(bx + 35, GROUND_Y - bh * 0.6 - 10, 20, bh * 0.6);
    }

    // Clouds (irradiated)
    gs.clouds.forEach(c => {
      ctx.fillStyle = "rgba(0,150,0,0.08)";
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 40, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x + 25, c.y - 8, 25, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Ground
    ctx.fillStyle = "#0a1a0a";
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
    ctx.fillStyle = "#1a3a1a";
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 3);

    // Scrolling ground texture
    for (let i = 0; i < 20; i++) {
      const tx = ((i * 60 - gs.bgX) + CANVAS_W * 2) % CANVAS_W;
      ctx.fillStyle = "rgba(0,100,0,0.3)";
      ctx.fillRect(tx, GROUND_Y + 5, 20, 2);
    }

    // Particles
    gs.particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#00FF00";
      ctx.shadowColor = "#00FF00";
      ctx.shadowBlur = 4;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 3, 3);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });

    // Obstacles
    gs.obstacles.forEach(o => {
      if (o.type === "barrel") drawBarrel(ctx, o.x, o.y, gs.tick);
      else if (o.type === "spike") drawSpike(ctx, o.x, o.y);
      else drawCrate(ctx, o.x, o.y);
    });

    // Player
    if (!gs.gameOver || gs.particles.length > 0) drawPlayer(ctx, 40, gs.playerY, gs.isJumping, gs.tick);

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, CANVAS_W, 28);
    ctx.fillStyle = "#00FF00";
    ctx.shadowColor = "#00FF00";
    ctx.shadowBlur = 6;
    ctx.font = "12px 'Share Tech Mono', monospace";
    ctx.fillText(`RADS SURVIVED: ${gs.score}`, 10, 18);
    ctx.fillText(`SPEED: ${gs.scrollSpeed.toFixed(1)}x`, 260, 18);
    ctx.fillText("JUMP: SPACE / ↑", 390, 18);
    ctx.shadowBlur = 0;

    if (!gs.gameOver) animRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const startGame = () => {
    const gs = gsRef.current;
    gs.playerY = GROUND_Y - 36;
    gs.playerVY = 0;
    gs.isJumping = false;
    gs.obstacles = [];
    gs.clouds = [];
    gs.particles = [];
    gs.scrollSpeed = SCROLL_SPEED_BASE;
    gs.score = 0;
    gs.tick = 0;
    gs.running = true;
    gs.gameOver = false;
    gs.spawnTimer = 0;
    gs.bgX = 0;
    gs.keys = {};
    setScore(0);
    setGameOver(false);
    setNewRecord(false);
    setStarted(true);
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => () => { cancelAnimationFrame(animRef.current); gsRef.current.running = false; }, []);

  // Touch / mouse: tap the canvas to jump (mobile support)
  const handleJumpTap = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const gs = gsRef.current;
    if (!gs.isJumping && gs.running && !gs.gameOver) {
      gs.playerVY = JUMP_FORCE;
      gs.isJumping = true;
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-green-500/70 mb-1">Radiation Runner v1.0</div>
        <div className="glow text-green-400 text-sm">RADS SURVIVED: {score}</div>
        <div className="text-xs text-green-500/70 mt-1">{t("record.best")}: {best}</div>
      </div>

      <div className="relative pipboy-border">
        <canvas
          ref={canvasRef}
          id="radiation-runner-canvas"
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={handleJumpTap}
          style={{ display: "block", background: "#020a02", touchAction: "none" }}
        />
        {!started && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <div className="glow text-green-400 text-2xl mb-2 font-mono">RADIATION RUNNER</div>
            <div className="text-green-300 text-sm mb-4 text-center px-8">
              Jump over radioactive barrels, spikes, and crates!<br/>
              Speed increases as you survive longer.
            </div>
            <button className="pipboy-btn" onClick={startGame}>[ START RUNNING ]</button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <div className="glow-red text-red-400 text-2xl mb-2 font-mono">IRRADIATED!</div>
            <div className="text-green-400 text-sm mb-1">Rads Survived: {score}</div>
            {newRecord
              ? <div className="glow text-green-300 text-sm mb-4 flicker">★ {t("record.new")} ★</div>
              : <div className="text-green-500/70 text-xs mb-4">{t("record.best")}: {best}</div>}
            <div className="flex gap-2 flex-wrap justify-center">
              <button className="pipboy-btn" onClick={startGame}>[ TRY AGAIN ]</button>
              <button className="pipboy-btn" onClick={() => setShowLb(true)}>🏆 {t("lb.view")}</button>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-green-600 text-center">
        SPACE / ↑ / TAP to jump • Avoid all obstacles
      </div>

      {showLb && (
        <Leaderboard game="runner" title="RADIATION RUNNER" score={score} onClose={() => setShowLb(false)} />
      )}
    </div>
  );
}
