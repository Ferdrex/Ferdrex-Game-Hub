import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "es";
export type Theme = "green" | "amber" | "blue" | "red";
export type Scale = "desktop" | "mobile";

export interface AppSettings {
  language: Language;
  theme: Theme;
  scale: Scale;
}

interface AppContextType {
  settings: AppSettings;
  setLanguage: (l: Language) => void;
  setTheme: (t: Theme) => void;
  setScale: (s: Scale) => void;
  t: (key: string) => string;
}

const TRANSLATIONS: Record<string, Record<Language, string>> = {
  "app.title":           { en: "DREX ARCADE", es: "DREX ARCADE" },
  "app.dev":             { en: "Developed by Ferdrex Games Studios", es: "Desarrollado por Ferdrex Games Studios" },
  "app.select":          { en: "SELECT A GAME MODULE", es: "SELECCIONA UN JUEGO" },
  "app.version":         { en: "GAME COLLECTION", es: "COLECCIÓN DE JUEGOS" },
  "menu.back":           { en: "← MENU", es: "← MENÚ" },
  "menu.settings":       { en: "SETTINGS", es: "AJUSTES" },
  "menu.language":       { en: "Language", es: "Idioma" },
  "menu.theme":          { en: "Theme", es: "Tema" },
  "menu.scale":          { en: "Display", es: "Pantalla" },
  "menu.desktop":        { en: "Desktop", es: "Escritorio" },
  "menu.mobile":         { en: "Mobile", es: "Móvil" },
  "menu.close":          { en: "CLOSE", es: "CERRAR" },
  "game.chess.name":     { en: "CHESS", es: "AJEDREZ" },
  "game.chess.desc":     { en: "Classic chess. Play Human vs Human or challenge our AI.", es: "Ajedrez clásico. Juega Humano vs Humano o desafía nuestra IA." },
  "game.chess.tag":      { en: "[ STRATEGY ]", es: "[ ESTRATEGIA ]" },
  "game.laser.name":     { en: "LASER ADVENTURE", es: "AVENTURA LÁSER" },
  "game.laser.desc":     { en: "Pixel art shooter. Scavenger vs. Cyber-Drones with screen shake effects.", es: "Shooter pixel art. Chatarrero vs Ciberdrones con efecto de vibración." },
  "game.laser.tag":      { en: "[ ACTION ]", es: "[ ACCIÓN ]" },
  "game.cards.name":     { en: "GAMES OF CHANCE", es: "JUEGOS DE AZAR" },
  "game.cards.desc":     { en: "Blackjack, Video Poker and Solitaire. Three classic card games.", es: "Blackjack, Video Póker y Solitario. Tres clásicos de naipes." },
  "game.cards.tag":      { en: "[ CHANCE ]", es: "[ AZAR ]" },
  "game.runner.name":    { en: "RADIATION RUNNER", es: "CORREDOR RADIACTIVO" },
  "game.runner.desc":    { en: "Infinite runner. Jump over obstacles and survive as long as possible.", es: "Corredor infinito. Salta obstáculos y sobrevive el mayor tiempo posible." },
  "game.runner.tag":     { en: "[ RUNNER ]", es: "[ CORREDOR ]" },
  "game.terminal.name":  { en: "TERMINAL HACKER", es: "HACKER DE TERMINAL" },
  "game.terminal.desc":  { en: "RobCo hacking minigame. Crack the password to unlock classified files.", es: "Minijuego de hackeo RobCo. Descifra la contraseña para abrir archivos clasificados." },
  "game.terminal.tag":   { en: "[ PUZZLE ]", es: "[ PUZZLE ]" },
  "record.best":         { en: "BEST", es: "RÉCORD" },
  "record.new":          { en: "NEW RECORD!", es: "¡NUEVO RÉCORD!" },
  "lb.title":            { en: "GLOBAL LEADERBOARD", es: "RANKING GLOBAL" },
  "lb.view":             { en: "GLOBAL RANKING", es: "RANKING GLOBAL" },
  "lb.yourname":         { en: "ENTER YOUR NAME", es: "ESCRIBE TU NOMBRE" },
  "lb.submit":           { en: "SUBMIT SCORE", es: "ENVIAR PUNTAJE" },
  "lb.submitting":       { en: "SENDING...", es: "ENVIANDO..." },
  "lb.submitted":        { en: "SCORE SUBMITTED!", es: "¡PUNTAJE ENVIADO!" },
  "lb.error":            { en: "Could not connect. Try again.", es: "No se pudo conectar. Reintenta." },
  "lb.empty":            { en: "No scores yet. Be the first!", es: "Sin puntajes aún. ¡Sé el primero!" },
  "lb.loading":          { en: "LOADING RANKING...", es: "CARGANDO RANKING..." },
  "lb.close":            { en: "CLOSE", es: "CERRAR" },
  "lb.you":              { en: "YOUR SCORE", es: "TU PUNTAJE" },
  "game.snake.name":     { en: "SNAKE", es: "SNAKE" },
  "game.snake.desc":     { en: "Classic snake. Eat, grow, and don't crash into yourself.", es: "La serpiente clásica. Come, crece y no choques contigo mismo." },
  "game.snake.tag":      { en: "[ ARCADE ]", es: "[ ARCADE ]" },
  "game.tetris.name":    { en: "TETRIS", es: "TETRIS" },
  "game.tetris.desc":    { en: "Stack the falling blocks and clear lines. Speeds up over time.", es: "Apila los bloques que caen y completa líneas. Se acelera con el tiempo." },
  "game.tetris.tag":     { en: "[ PUZZLE ]", es: "[ PUZZLE ]" },
  "game.2048.name":      { en: "2048", es: "2048" },
  "game.2048.desc":      { en: "Slide and merge tiles until you reach 2048.", es: "Desliza y combina fichas hasta llegar a 2048." },
  "game.2048.tag":       { en: "[ PUZZLE ]", es: "[ PUZZLE ]" },
  "game.mines.name":     { en: "MINESWEEPER", es: "BUSCAMINAS" },
  "game.mines.desc":     { en: "Reveal the field without hitting a mine. Flag them all.", es: "Descubre el campo sin pisar una mina. Marca todas." },
  "game.mines.tag":      { en: "[ LOGIC ]", es: "[ LÓGICA ]" },
  "snake.start":         { en: "[ START ]", es: "[ INICIAR ]" },
  "snake.retry":         { en: "[ TRY AGAIN ]", es: "[ REINTENTAR ]" },
  "snake.over":          { en: "GAME OVER", es: "FIN DEL JUEGO" },
  "snake.controls":      { en: "Arrows / WASD • On mobile: swipe to turn", es: "Flechas / WASD • En móvil: desliza para girar" },
  "tetris.start":        { en: "[ START ]", es: "[ INICIAR ]" },
  "tetris.retry":        { en: "[ TRY AGAIN ]", es: "[ REINTENTAR ]" },
  "tetris.over":         { en: "GAME OVER", es: "FIN DEL JUEGO" },
  "tetris.controls":     { en: "◀▶ move • ⟳ rotate • ▼ soft • ⤓ hard drop", es: "◀▶ mover • ⟳ rotar • ▼ bajar • ⤓ caída rápida" },
  "tetris.lines":        { en: "LINES", es: "LÍNEAS" },
  "g2048.new":           { en: "[ NEW GAME ]", es: "[ NUEVO JUEGO ]" },
  "g2048.over":          { en: "GAME OVER", es: "FIN DEL JUEGO" },
  "g2048.keep":          { en: "You reached 2048!", es: "¡Llegaste a 2048!" },
  "g2048.continue":      { en: "[ KEEP GOING ]", es: "[ SEGUIR ]" },
  "g2048.controls":      { en: "Arrows / WASD • On mobile: swipe", es: "Flechas / WASD • En móvil: desliza" },
  "mine.win":            { en: "CLEARED!", es: "¡DESPEJADO!" },
  "mine.boom":           { en: "BOOM!", es: "¡BOOM!" },
  "mine.new":            { en: "[ NEW GAME ]", es: "[ NUEVO JUEGO ]" },
  "mine.controls":       { en: "Click to reveal • Right-click / long-press to flag", es: "Click para descubrir • Clic derecho / mantener para marcar" },
  "game.quiniela.name":  { en: "WORLD CUP 2026", es: "QUINIELA 2026" },
  "game.quiniela.desc":  { en: "Predict the 2026 World Cup: champion, finalist and top scorer.", es: "Pronostica el Mundial 2026: campeón, finalista y goleador." },
  "game.quiniela.tag":   { en: "[ PREDICT ]", es: "[ QUINIELA ]" },
  "qn.title":            { en: "WORLD CUP 2026 PREDICTION", es: "QUINIELA MUNDIAL 2026" },
  "qn.intro":            { en: "Make your prediction and register your name.", es: "Haz tu pronóstico y registra tu nombre." },
  "qn.name":             { en: "YOUR NAME", es: "TU NOMBRE" },
  "qn.name_ph":          { en: "e.g. Totito", es: "ej. Totito" },
  "qn.champion":         { en: "CHAMPION", es: "CAMPEÓN" },
  "qn.runnerup":         { en: "RUNNER-UP", es: "SUBCAMPEÓN" },
  "qn.scorer":           { en: "TOP SCORER", es: "GOLEADOR" },
  "qn.scorer_ph":        { en: "e.g. Mbappé, Messi...", es: "ej. Mbappé, Messi..." },
  "qn.pick":             { en: "— select —", es: "— elige —" },
  "qn.submit":           { en: "SUBMIT PREDICTION", es: "ENVIAR QUINIELA" },
  "qn.sending":          { en: "SENDING...", es: "ENVIANDO..." },
  "qn.success":          { en: "PREDICTION SAVED!", es: "¡QUINIELA GUARDADA!" },
  "qn.error":            { en: "Could not send. Try again.", es: "No se pudo enviar. Reintenta." },
  "qn.required":         { en: "Please fill in all fields.", es: "Completa todos los campos." },
  "qn.samewarn":         { en: "Champion and runner-up must differ.", es: "Campeón y subcampeón deben ser distintos." },
  "qn.again":            { en: "[ NEW PREDICTION ]", es: "[ NUEVA QUINIELA ]" },
  "qn.privacy":          { en: "Your name is stored privately. Only aggregate stats are shared.", es: "Tu nombre se guarda de forma privada. Solo se comparten estadísticas agregadas." },
  "wc.header":           { en: "WORLD CUP 2026", es: "MUNDIAL 2026" },
  "wc.tab.quiniela":     { en: "PREDICTION", es: "QUINIELA" },
  "wc.tab.forecast":     { en: "FORECAST & BETS", es: "PRONÓSTICO Y APUESTAS" },
  "fc.balance":          { en: "BALANCE", es: "SALDO" },
  "fc.bet":              { en: "BET", es: "APUESTA" },
  "fc.broke":            { en: "Out of caps!", es: "¡Sin caps!" },
  "fc.reset":            { en: "[ REFILL CAPS ]", es: "[ RECARGAR CAPS ]" },
  "fc.predicted":        { en: "Forecast", es: "Pronóstico" },
  "fc.win":              { en: "WON", es: "GANASTE" },
  "fc.lose":             { en: "LOST", es: "PERDISTE" },
  "fc.disclaimer":       { en: "Fake caps only — no real money. Forecasts are the system's opinion, not guarantees.", es: "Solo caps ficticios — sin dinero real. Los pronósticos son opinión del sistema, no garantías." },
  "fc.howto":            { en: "Pick an amount, bet on a match, and it settles once the match is played.", es: "Elige un monto, apuesta a un partido, y se liquida cuando el partido termina." },
  "fc.result":           { en: "Result", es: "Resultado" },
  "fc.youbet":           { en: "You bet", es: "Apostaste" },
  "fc.awaiting":         { en: "awaiting result", es: "esperando resultado" },
  "fc.nobet":            { en: "— no bet placed —", es: "— sin apuesta —" },
  "chess.mode.hvh":      { en: "Human vs Human", es: "Humano vs Humano" },
  "chess.mode.hvai":     { en: "Human vs AI", es: "Humano vs IA" },
  "chess.reset":         { en: "RESET", es: "REINICIAR" },
  "chess.flip":          { en: "FLIP", es: "GIRAR" },
  "chess.white":         { en: "White's turn", es: "Turno de Blancas" },
  "chess.black":         { en: "Black's turn", es: "Turno de Negras" },
  "chess.white.wins":    { en: "White wins!", es: "¡Ganan las Blancas!" },
  "chess.black.wins":    { en: "Black wins!", es: "¡Ganan las Negras!" },
  "chess.check":         { en: "CHECK!", es: "¡JAQUE!" },
  "chess.thinking":      { en: "AI thinking...", es: "IA pensando..." },
  "chess.stalemate":     { en: "STALEMATE — DRAW", es: "AHOGADO — EMPATE" },
  "chess.captures.b":    { en: "Black captures:", es: "Capturadas por negras:" },
  "chess.captures.w":    { en: "White captures:", es: "Capturadas por blancas:" },
  "cards.blackjack":     { en: "BLACKJACK", es: "BLACKJACK" },
  "cards.poker":         { en: "VIDEO POKER", es: "VIDEO PÓKER" },
  "cards.solitaire":     { en: "SOLITAIRE", es: "SOLITARIO" },
  "bj.deal":             { en: "DEAL", es: "REPARTIR" },
  "bj.hit":              { en: "HIT", es: "CARTA" },
  "bj.stand":            { en: "STAND", es: "PLANTARSE" },
  "bj.double":           { en: "DOUBLE", es: "DOBLAR" },
  "bj.dealer":           { en: "DEALER", es: "BANCA" },
  "bj.player":           { en: "PLAYER", es: "JUGADOR" },
  "bj.bust":             { en: "BUST!", es: "¡PASADO!" },
  "bj.win":              { en: "YOU WIN!", es: "¡GANASTE!" },
  "bj.lose":             { en: "YOU LOSE", es: "PERDISTE" },
  "bj.push":             { en: "PUSH", es: "EMPATE" },
  "bj.blackjack":        { en: "BLACKJACK!", es: "¡BLACKJACK!" },
  "bj.balance":          { en: "BALANCE", es: "SALDO" },
  "bj.bet":              { en: "BET", es: "APUESTA" },
  "poker.deal":          { en: "DEAL", es: "REPARTIR" },
  "poker.hold":          { en: "HOLD", es: "GUARDAR" },
  "poker.draw":          { en: "DRAW", es: "CAMBIAR" },
  "poker.bet":           { en: "BET", es: "APUESTA" },
  "poker.win":           { en: "YOU WIN!", es: "¡GANASTE!" },
  "poker.hand":          { en: "HAND", es: "MANO" },
  "sol.new":             { en: "NEW GAME", es: "NUEVO JUEGO" },
  "sol.score":           { en: "SCORE", es: "PUNTOS" },
  "sol.win":             { en: "YOU WIN!", es: "¡GANASTE!" },
  "term.title":          { en: "VAULT-TEC TERMINAL", es: "TERMINAL VAULT-TEC" },
  "term.intro":          { en: "Crack the password to unlock a classified file. You get 4 attempts. After each guess you see how many letters match exactly.", es: "Descifra la contraseña para abrir un archivo clasificado. Tienes 4 intentos. Tras cada intento verás cuántas letras coinciden exactamente." },
  "term.difficulty":     { en: "SELECT DIFFICULTY:", es: "SELECCIONA DIFICULTAD:" },
  "term.4letter":        { en: "[ 4-LETTER WORDS ]", es: "[ PALABRAS DE 4 LETRAS ]" },
  "term.5letter":        { en: "[ 5-LETTER WORDS ]", es: "[ PALABRAS DE 5 LETRAS ]" },
  "term.candidates":     { en: "PASSWORD CANDIDATES:", es: "CONTRASEÑAS POSIBLES:" },
  "term.output":         { en: "TERMINAL OUTPUT:", es: "SALIDA DE TERMINAL:" },
  "term.attempts":       { en: "ATTEMPTS:", es: "INTENTOS:" },
  "term.tryagain":       { en: "[ TRY AGAIN ]", es: "[ REINTENTAR ]" },
  "term.menu":           { en: "[ MENU ]", es: "[ MENÚ ]" },
  "term.streak":         { en: "STREAK", es: "RACHA" },
  "launch":              { en: "LAUNCH", es: "INICIAR" },
  "boot.init":           { en: "INITIALIZING FERDREX SYSTEM...", es: "INICIALIZANDO SISTEMA FERDREX..." },
  "boot.memory":         { en: "MEMORY OK: 64KB", es: "MEMORIA OK: 64KB" },
  "boot.video":          { en: "VIDEO SUBSYSTEM: ONLINE", es: "SUBSISTEMA DE VIDEO: EN LÍNEA" },
  "boot.audio":          { en: "AUDIO ENGINE: ONLINE", es: "MOTOR DE AUDIO: EN LÍNEA" },
  "boot.modules":        { en: "GAME MODULES: LOADING...", es: "MÓDULOS DE JUEGO: CARGANDO..." },
  "boot.progress":       { en: "[####################] 100%", es: "[####################] 100%" },
  "boot.welcome":        { en: "WELCOME, PLAYER.", es: "BIENVENIDO, JUGADOR." },
  "boot.ready":          { en: "READY.", es: "LISTO." },
};

const THEME_COLORS: Record<Theme, { primary: string; glow: string; cssVars: Record<string, string> }> = {
  green: {
    primary: "#00FF00",
    glow: "0 0 10px #00FF00",
    cssVars: {
      "--background":         "120 100% 4%",
      "--foreground":         "120 100% 70%",
      "--border":             "120 80% 25%",
      "--primary":            "120 100% 50%",
      "--muted":              "120 40% 10%",
      "--muted-foreground":   "120 50% 45%",
      "--accent":             "120 100% 35%",
      "--theme-color":        "#00FF00",
    },
  },
  amber: {
    primary: "#FFC000",
    glow: "0 0 10px #FFC000",
    cssVars: {
      "--background":         "40 100% 3%",
      "--foreground":         "40 100% 70%",
      "--border":             "40 80% 25%",
      "--primary":            "40 100% 50%",
      "--muted":              "40 40% 10%",
      "--muted-foreground":   "40 50% 45%",
      "--accent":             "40 100% 35%",
      "--theme-color":        "#FFC000",
    },
  },
  blue: {
    primary: "#00CCFF",
    glow: "0 0 10px #00CCFF",
    cssVars: {
      "--background":         "200 100% 4%",
      "--foreground":         "200 100% 70%",
      "--border":             "200 80% 25%",
      "--primary":            "200 100% 50%",
      "--muted":              "200 40% 10%",
      "--muted-foreground":   "200 50% 45%",
      "--accent":             "200 100% 35%",
      "--theme-color":        "#00CCFF",
    },
  },
  red: {
    primary: "#FF4444",
    glow: "0 0 10px #FF4444",
    cssVars: {
      "--background":         "0 80% 4%",
      "--foreground":         "0 80% 70%",
      "--border":             "0 60% 25%",
      "--primary":            "0 100% 50%",
      "--muted":              "0 40% 10%",
      "--muted-foreground":   "0 50% 45%",
      "--accent":             "0 80% 35%",
      "--theme-color":        "#FF4444",
    },
  },
};

const AppContext = createContext<AppContextType | null>(null);

const SETTINGS_KEY = "drex-arcade-settings";
const DEFAULT_SETTINGS: AppSettings = { language: "en", theme: "green", scale: "desktop" };

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      // Only accept known values to avoid corrupt storage breaking the app.
      const theme = ["green", "amber", "blue", "red"].includes(parsed.theme as string) ? parsed.theme! : DEFAULT_SETTINGS.theme;
      const language = ["en", "es"].includes(parsed.language as string) ? parsed.language! : DEFAULT_SETTINGS.language;
      const scale = ["desktop", "mobile"].includes(parsed.scale as string) ? parsed.scale! : DEFAULT_SETTINGS.scale;
      return { theme, language, scale };
    }
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_SETTINGS;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const setLanguage = (language: Language) => setSettings(s => ({ ...s, language }));
  const setTheme = (theme: Theme) => setSettings(s => ({ ...s, theme }));
  const setScale = (scale: Scale) => setSettings(s => ({ ...s, scale }));

  const t = (key: string): string => TRANSLATIONS[key]?.[settings.language] ?? key;

  // Persist preferences so they survive reloads.
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [settings]);

  useEffect(() => {
    const vars = THEME_COLORS[settings.theme].cssVars;
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [settings.theme]);

  return (
    <AppContext.Provider value={{ settings, setLanguage, setTheme, setScale, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
