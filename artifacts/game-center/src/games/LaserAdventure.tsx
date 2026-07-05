import { useEffect, useRef, useState, useCallback } from "react";

const player_speed = 5;
const enemy_spawn_rate = 1.2;
const theme_glow = "0 0 10px #00FF00";
const LASER_SPEED = 10;
const ENEMY_SPEED_BASE = 1.5;
const CANVAS_W = 600;
const CANVAS_H = 400;

type Entity = { x: number; y: number; w: number; h: number; vx?: number; vy?: number; hp?: number };
type Laser = { x: number; y: number; active: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string };

function drawPixelPlayer(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  ctx.imageSmoothingEnabled = false;

  // Body (armor)
  ctx.fillStyle = "#2a5c2a";
  ctx.fillRect(px + 8, py + 12, 16, 18);

  // Head
  ctx.fillStyle = "#3d8c3d";
  ctx.fillRect(px + 9, py + 4, 14, 12);

  // Visor glow
  ctx.fillStyle = "#00ffaa";
  ctx.fillRect(px + 11, py + 7, 10, 5);
  ctx.shadowColor = "#00ffaa";
  ctx.shadowBlur = 8;
  ctx.fillRect(px + 11, py + 7, 10, 5);
  ctx.shadowBlur = 0;

  // Shoulders
  ctx.fillStyle = "#1e4a1e";
  ctx.fillRect(px + 4, py + 12, 8, 10);
  ctx.fillRect(px + 20, py + 12, 8, 10);

  // Legs
  ctx.fillStyle = "#1a3d1a";
  ctx.fillRect(px + 9, py + 28, 6, 10);
  ctx.fillRect(px + 17, py + 28, 6, 10);

  // Arm with gun
  ctx.fillStyle = "#666";
  ctx.fillRect(px + 24, py + 16, 10, 4);
  ctx.fillStyle = "#888";
  ctx.fillRect(px + 30, py + 14, 8, 2);

  // Scrap bits / equipment
  ctx.fillStyle = "#995500";
  ctx.fillRect(px + 8, py + 18, 3, 3);
  ctx.fillRect(px + 21, py + 20, 3, 3);
}

function drawCyberDrone(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  const px = Math.floor(x);
  const py = Math.floor(y) + Math.sin(tick * 0.05) * 3;
  ctx.imageSmoothingEnabled = false;

  // Main body (dark metal)
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(px + 4, py + 8, 24, 16);

  // Wing left
  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(px, py + 10, 8, 8);
  // Wing right
  ctx.fillRect(px + 24, py + 10, 8, 8);

  // Red glowing eyes
  ctx.fillStyle = "#ff0000";
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 10;
  ctx.fillRect(px + 8, py + 12, 5, 5);
  ctx.fillRect(px + 18, py + 12, 5, 5);
  ctx.shadowBlur = 0;

  // Antenna
  ctx.fillStyle = "#444";
  ctx.fillRect(px + 14, py + 2, 4, 8);
  ctx.fillStyle = "#ff0000";
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 6;
  ctx.fillRect(px + 15, py + 1, 2, 3);
  ctx.shadowBlur = 0;

  // Thruster flames
  ctx.fillStyle = "#ff6600";
  ctx.shadowColor = "#ff6600";
  ctx.shadowBlur = 8;
  ctx.fillRect(px + 6, py + 24, 4, 3 + Math.floor(Math.sin(tick * 0.3) * 2));
  ctx.fillRect(px + 22, py + 24, 4, 3 + Math.floor(Math.cos(tick * 0.3) * 2));
  ctx.shadowBlur = 0;

  // Claws
  ctx.fillStyle = "#555";
  ctx.fillRect(px + 10, py + 24, 3, 5);
  ctx.fillRect(px + 19, py + 24, 3, 5);
}

function drawLaser(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#00ffff";
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 12;
  ctx.fillRect(Math.floor(x), Math.floor(y - 2), 16, 4);
  ctx.shadowBlur = 0;
  // Core bright
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(Math.floor(x), Math.floor(y - 1), 16, 2);
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const alpha = p.life / p.maxLife;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 6;
  const size = 3 * alpha;
  ctx.fillRect(Math.floor(p.x), Math.floor(p.y), size, size);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

export default function LaserAdventure() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    player: { x: 100, y: 200, w: 32, h: 38 } as Entity,
    enemies: [] as (Entity & { hp: number })[],
    lasers: [] as Laser[],
    particles: [] as Particle[],
    keys: {} as Record<string, boolean>,
    score: 0,
    lives: 3,
    spawnTimer: 0,
    tick: 0,
    running: false,
    gameOver: false,
    screenShake: 0,
    slowMo: false,
    slowMoTimer: 0,
    laserCooldown: 0,
    lastTime: 0,
  });
  const animRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [shakeClass, setShakeClass] = useState("");

  const triggerShake = useCallback(() => {
    setShakeClass("screen-shake");
    setTimeout(() => setShakeClass(""), 400);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { gameStateRef.current.keys[e.code] = e.type === "keydown"; };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey); };
  }, []);

  const spawnEnemy = () => {
    const gs = gameStateRef.current;
    const y = 30 + Math.random() * (CANVAS_H - 80);
    gs.enemies.push({ x: CANVAS_W + 20, y, w: 32, h: 32, hp: 2, vy: (Math.random() - 0.5) * 1.5 });
  };

  const spawnExplosion = (x: number, y: number, color = "#ff4400") => {
    const gs = gameStateRef.current;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
      const speed = 1 + Math.random() * 3;
      gs.particles.push({
        x: x + 16, y: y + 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30, maxLife: 30,
        color,
      });
    }
  };

  const gameLoop = useCallback(() => {
    const gs = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !gs.running) return;
    const ctx = canvas.getContext("2d")!;
    gs.tick++;

    // Time scale for slow-mo
    const dt = gs.slowMo ? 0.25 : 1.0;

    // Input
    if (!gs.gameOver) {
      if (gs.keys["ArrowUp"] || gs.keys["KeyW"]) gs.player.y -= player_speed * dt;
      if (gs.keys["ArrowDown"] || gs.keys["KeyS"]) gs.player.y += player_speed * dt;
      if (gs.keys["ArrowLeft"] || gs.keys["KeyA"]) gs.player.x -= player_speed * dt;
      if (gs.keys["ArrowRight"] || gs.keys["KeyD"]) gs.player.x += player_speed * dt;
      gs.player.x = Math.max(0, Math.min(CANVAS_W - gs.player.w, gs.player.x));
      gs.player.y = Math.max(0, Math.min(CANVAS_H - gs.player.h, gs.player.y));

      // Shoot
      gs.laserCooldown = Math.max(0, gs.laserCooldown - dt);
      if ((gs.keys["Space"] || gs.keys["KeyF"]) && gs.laserCooldown <= 0) {
        gs.lasers.push({ x: gs.player.x + gs.player.w, y: gs.player.y + gs.player.h / 2, active: true });
        gs.laserCooldown = 12;
      }

      // Spawn enemies
      gs.spawnTimer += dt;
      if (gs.spawnTimer >= 60 / enemy_spawn_rate) {
        spawnEnemy();
        gs.spawnTimer = 0;
      }

      // Move lasers
      gs.lasers.forEach(l => { if (l.active) l.x += LASER_SPEED * dt; });
      gs.lasers = gs.lasers.filter(l => l.x < CANVAS_W + 20);

      // Move enemies
      const enemySpeed = ENEMY_SPEED_BASE + gs.score * 0.002;
      gs.enemies.forEach(e => {
        e.x -= enemySpeed * dt;
        e.y += (e.vy ?? 0) * dt;
        if (e.y < 0 || e.y > CANVAS_H - e.h) e.vy = -(e.vy ?? 0);
      });

      // Laser-enemy collisions
      gs.lasers.forEach(laser => {
        if (!laser.active) return;
        gs.enemies.forEach(enemy => {
          if (
            laser.x < enemy.x + enemy.w && laser.x + 16 > enemy.x &&
            laser.y - 2 < enemy.y + enemy.h && laser.y + 2 > enemy.y
          ) {
            laser.active = false;
            enemy.hp--;
            if (enemy.hp <= 0) {
              spawnExplosion(enemy.x, enemy.y, "#ff4400");
              spawnExplosion(enemy.x, enemy.y, "#ff0000");
              gs.score++;
              setScore(gs.score);
            } else {
              spawnExplosion(enemy.x, enemy.y, "#ffaa00");
            }
            gs.screenShake = 8;
            triggerShake();
          }
        });
      });
      gs.lasers = gs.lasers.filter(l => l.active);
      gs.enemies = gs.enemies.filter(e => e.hp > 0);

      // Player-enemy collision
      gs.enemies.forEach(enemy => {
        if (
          gs.player.x < enemy.x + enemy.w - 4 && gs.player.x + gs.player.w - 4 > enemy.x &&
          gs.player.y < enemy.y + enemy.h - 4 && gs.player.y + gs.player.h - 4 > enemy.y
        ) {
          spawnExplosion(enemy.x, enemy.y, "#ff0000");
          gs.enemies = gs.enemies.filter(e => e !== enemy);
          gs.lives--;
          gs.screenShake = 16;
          triggerShake();
          setLives(gs.lives);
          if (gs.lives <= 0) {
            gs.gameOver = true;
            gs.running = false;
            setGameOver(true);
          }
        }
      });

      // Slow-mo when low HP
      gs.slowMo = gs.lives === 1;

      // Enemy falls off screen
      gs.enemies = gs.enemies.filter(e => e.x > -60);

      // Particles
      gs.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      });
      gs.particles = gs.particles.filter(p => p.life > 0);
    }

    // ---- DRAW ----
    // Background
    ctx.fillStyle = "#040d04";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Starfield background
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137 + gs.tick * 0.3) % CANVAS_W);
      const sy = (i * 73) % CANVAS_H;
      const brightness = 0.3 + 0.7 * ((i % 5) / 5);
      ctx.fillStyle = `rgba(0,255,0,${brightness * 0.3})`;
      ctx.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
    }

    // Ground line
    ctx.strokeStyle = "rgba(0,255,0,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H - 2);
    ctx.lineTo(CANVAS_W, CANVAS_H - 2);
    ctx.stroke();

    // Particles
    gs.particles.forEach(p => drawParticle(ctx, p));

    // Lasers
    gs.lasers.forEach(l => drawLaser(ctx, l.x, l.y));

    // Player
    if (!gs.gameOver) drawPixelPlayer(ctx, gs.player.x, gs.player.y);

    // Enemies
    gs.enemies.forEach(e => drawCyberDrone(ctx, e.x, e.y, gs.tick));

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, CANVAS_W, 30);
    ctx.fillStyle = "#00FF00";
    ctx.shadowColor = "#00FF00";
    ctx.shadowBlur = 6;
    ctx.font = "12px 'Share Tech Mono', monospace";
    ctx.fillText(`SCORE: ${gs.score}`, 10, 20);
    ctx.fillText(`LIVES: ${"♦".repeat(Math.max(0, gs.lives))}${"◇".repeat(Math.max(0, 3 - gs.lives))}`, 200, 20);
    ctx.fillText(gs.slowMo ? "! CRITICAL !" : "LASER: [SPACE/F]", 360, 20);
    ctx.shadowBlur = 0;

    // Slow-mo vignette
    if (gs.slowMo) {
      const grad = ctx.createRadialGradient(CANVAS_W/2, CANVAS_H/2, CANVAS_H * 0.3, CANVAS_W/2, CANVAS_H/2, CANVAS_H);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(1, "rgba(255,0,0,0.3)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      // Pulse border
      const pulse = Math.sin(gs.tick * 0.1) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(255,0,0,${0.3 + pulse * 0.5})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, CANVAS_W - 4, CANVAS_H - 4);
    }

    if (!gs.gameOver) animRef.current = requestAnimationFrame(gameLoop);
  }, [triggerShake]);

  const startGame = () => {
    const gs = gameStateRef.current;
    gs.player = { x: 100, y: 200, w: 32, h: 38 };
    gs.enemies = [];
    gs.lasers = [];
    gs.particles = [];
    gs.score = 0;
    gs.lives = 3;
    gs.spawnTimer = 0;
    gs.tick = 0;
    gs.running = true;
    gs.gameOver = false;
    gs.screenShake = 0;
    gs.slowMo = false;
    gs.laserCooldown = 0;
    gs.keys = {};
    setScore(0);
    setLives(3);
    setGameOver(false);
    setGameStarted(true);
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      gameStateRef.current.running = false;
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-green-500/70 mb-1">Laser Adventure v2.1</div>
        <div className="glow text-green-400 text-sm">
          Score: {score} | Lives: {"♦".repeat(Math.max(0,lives))}{"◇".repeat(Math.max(0,3-lives))}
        </div>
      </div>

      <div className={`relative pipboy-border ${shakeClass}`}>
        <canvas
          ref={canvasRef}
          id="laser-adventure-canvas"
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: "block", background: "#040d04" }}
        />
        {!gameStarted && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <div className="glow text-green-400 text-2xl mb-2 font-mono">LASER ADVENTURE</div>
            <div className="text-green-300 text-sm mb-1">Retro-Tech Scavenger vs. Cyber-Drones</div>
            <div className="text-green-500/70 text-xs mb-4">
              WASD/Arrows: Move • SPACE/F: Shoot<br/>
              Slow-Mo activates when you're near death!
            </div>
            <button className="pipboy-btn" onClick={startGame}>[ BOOT GAME ]</button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <div className="glow-red text-red-400 text-2xl mb-2 font-mono">GAME OVER</div>
            <div className="text-green-400 text-sm mb-4">Final Score: {score}</div>
            <button className="pipboy-btn" onClick={startGame}>[ RETRY ]</button>
          </div>
        )}
      </div>

      <div className="text-xs text-green-600 text-center">
        WASD / Arrow Keys to move • SPACE or F to shoot laser
      </div>
    </div>
  );
}
