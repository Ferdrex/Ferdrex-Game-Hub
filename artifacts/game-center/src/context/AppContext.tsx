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

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    language: "en",
    theme: "green",
    scale: "desktop",
  });

  const setLanguage = (language: Language) => setSettings(s => ({ ...s, language }));
  const setTheme = (theme: Theme) => setSettings(s => ({ ...s, theme }));
  const setScale = (scale: Scale) => setSettings(s => ({ ...s, scale }));

  const t = (key: string): string => TRANSLATIONS[key]?.[settings.language] ?? key;

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
