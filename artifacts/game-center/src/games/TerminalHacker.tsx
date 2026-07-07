import { useState, useCallback, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { getHighScore, submitHighScore } from "../lib/highscore";

// ---- Fallout-style memory dump with clickable symbol brackets ----
const JUNK_CHARS = "!@#$%^&*-+=?~/\\|_:;.,°¬";
const BRACKETS: [string, string][] = [["<", ">"], ["[", "]"], ["{", "}"], ["(", ")"]];

type SymEffect = "dud" | "reset";
type Sym = { id: number; cluster: string; effect: SymEffect; used: boolean };
type MemPart = { kind: "junk"; text: string } | { kind: "sym"; id: number };
type MemLine = { addr: string; parts: MemPart[] };

function randChars(pool: string, n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += pool[Math.floor(Math.random() * pool.length)];
  return s;
}
const junk = (n: number) => randChars(JUNK_CHARS, n);
const hex = (n: number) => randChars("0123456789ABCDEF", n);
function makeCluster(): string {
  const [open, close] = BRACKETS[Math.floor(Math.random() * BRACKETS.length)];
  return open + junk(2 + Math.floor(Math.random() * 3)) + close;
}

// Build the symbol set + the junk lines they hide in.
function buildMemory(symCount: number, lines: number): { syms: Sym[]; memLines: MemLine[] } {
  const effects: SymEffect[] = [];
  for (let i = 0; i < symCount; i++) effects.push(Math.random() < 0.28 ? "reset" : "dud");
  if (!effects.includes("reset")) effects[Math.floor(Math.random() * symCount)] = "reset";
  const syms: Sym[] = effects.map((effect, id) => ({ id, effect, cluster: makeCluster(), used: false }));

  const slots: number[][] = Array.from({ length: lines }, () => []);
  syms.forEach(s => slots[Math.floor(Math.random() * lines)].push(s.id));

  const memLines: MemLine[] = slots.map(ids => {
    const parts: MemPart[] = [{ kind: "junk", text: junk(3 + Math.floor(Math.random() * 3)) }];
    ids.forEach(id => {
      parts.push({ kind: "sym", id });
      parts.push({ kind: "junk", text: junk(3 + Math.floor(Math.random() * 4)) });
    });
    if (ids.length === 0) parts.push({ kind: "junk", text: junk(5 + Math.floor(Math.random() * 6)) });
    return { addr: "0x" + hex(4), parts };
  });
  return { syms, memLines };
}

const WORD_LIST_4 = ["ATOM","BOMB","BYTE","CODE","CORE","DATA","DEAD","DOOM","DRUG","FILE","FIRE","FUSE","GENE","GHUL","GLOW","GUNS","HACK","HALF","HARD","HELM","HOPE","HUNT","IRON","ITEM","KILL","LIFE","LOCK","LOOT","MOLE","NUKE","OPEN","ORDO","OVER","PACK","PIPE","PLAN","PLEX","PLOT","POLL","PRAY","PURR","QUIT","RACE","RAID","RADS","RIFT","RISK","RUIN","RUST","SAFE","SALT","SCAN","SCAV","SCAR","SEEK","SELF","SEND","SHOT","SIGN","SITE","SKIN","SLAG","SLIM","SLUM","SLOT","SLOW","SLUM","SMOG","SOFT","SOIL","SOUL","SOUP","SPAN","SPIN","SPIT","SPOT","STEP","STOP","STUB","SYNC","TANK","TASK","TEST","TEXT","TICK","TILE","TIME","TINT","TOOL","TRAP","TREK","TRIP","TRUE","TUNE","TURN","TYPE","UNIT","VATS","VAST","VAULT","VENT","VIEW","VOID","VOLT","VOTE","WALK","WALL","WARN","WARP","WAIT","WORM","ZONE","ZERO"];
const WORD_LIST_5 = ["AGENT","ALERT","ALPHA","AMMO","ARMOR","BLAST","BLAZE","BLOOD","BOUND","BREED","CACHE","CASTE","CHAOS","CHEST","CHILD","CLAIM","CLEAN","CLONE","CLOUD","COAST","COUNT","CRASH","CRAWL","CREED","CROSS","CRUEL","CYBER","DECAY","DELTA","DEPOT","DIRTY","DODGE","DOORS","DRAFT","DRAIN","DRIVE","DRONE","DROWN","DRUGS","ELITE","EMBER","ENEMY","EQUIP","EVADE","EVENT","EXILE","EXTRA","FERAL","FETCH","FIELD","FIGHT","FIRST","FLAME","FLASH","FLESH","FLOOR","FORCE","FORGE","FOUND","FRAME","FREED","FRONT","GHOST","GIANT","GLOOM","GOONS","GRANT","GRAVE","GREAT","GREEN","GRID","GRIME","GRIND","GROUP","GROWL","GUARD","HAVEN","HEAVY","HEIST","HOARD","HONOR","HOUSE","HUMAN","IRRAD","KARMA","KNEEL","KNIFE","LIGHT","LOGIC","MAJOR","MARSH","MERGE","MERIT","MINOR","NEXUS","NIGHT","NOISE","ORDER","OUTDO","OUTER","PANEL","PERKS","PHASE","PILOT","PIPES","POINT","POWER","PROBE","PURGE","QUEST","QUICK","QUIET","RADAR","RADIO","REALM","RECON","RELAY","REPEL","RESET","RISEN","RIVAL","ROBOT","ROVER","RUINS","RULES","SCRAP","SIEGE","SKILL","SLASH","SLEEP","SLIME","SOLAR","SPAWN","SQUAD","STARK","STEAL","STEEL","STORM","STRAY","STRIP","SURGE","SWAMP","SWORD","SYNTH","TOXIN","TRACE","TRACK","TRADE","TRAIL","TRAIN","TRAIT","TRIBE","TRICK","TROOP","TRUST","TUNER","ULTRA","UNION","UNITY","UNLIT","UNWED","VAULT","VISOR","VOUCH","WASTE","WATCH","WATER","WAVES","WEIRD","WOUND","WRATH","ZONES"];

const SECRET_FILES = [
  {
    filename: "TOTITO_PERSONAL.dat",
    content: [
      "CLASSIFIED - VAULT-TEC PERSONNEL DOSSIER",
      "Subject: TOTITO",
      "Status: LEGENDARY WASTELAND SURVIVOR",
      "",
      "Known skills: Exceptional charisma, expert trader,",
      "master chef (pre-war recipes), lockpicking level 10.",
      "",
      "Notable: Saved Megaton colony three times.",
      "Carries a lucky bottle cap collection.",
      "Weakness: Cannot resist a good card game.",
      "",
      ">>> END CLASSIFIED RECORD <<<"
    ]
  },
  {
    filename: "TOTITO_MISSIONS.dat",
    content: [
      "MISSION LOG - SUBJECT: TOTITO",
      "",
      "MISSION 001: Recovered 500 caps from Super Mutant",
      "MISSION 002: Negotiated peace with Brotherhood",
      "MISSION 003: Built settlement in irradiated zone",
      "MISSION 004: Hacked SECURITRON mainframe with 2 tries",
      "MISSION 005: Defeated Deathclaw unarmed (LEGENDARY)",
      "",
      "Current Reputation: IDOLIZED",
      "Karma Level: VERY GOOD",
      "",
      ">>> NEXT MISSION: CLASSIFIED <<<"
    ]
  },
  {
    filename: "TOTITO_SECRETS.dat",
    content: [
      "TOP SECRET - EYES ONLY",
      "",
      "TOTITO'S HIDDEN BUNKER COORDINATES:",
      "37.2N / 115.8W (Area 51 adjacent - coincidence?)",
      "",
      "Personality analysis: 'Annoyingly competent'",
      "- Field agent Morse, Rivet City Intel",
      "",
      "Known aliases: The Pip-Boy Kid, Cap Collector,",
      "The Wanderer, Dr. Nuke (unverified),",
      "The One Who Returned.",
      "",
      ">>> VAULT-TEC THANKS YOU FOR YOUR LOYALTY <<<"
    ]
  }
];

const WORD_LIST_6 = ["BUNKER","CANYON","CIPHER","COBALT","DANGER","DECODE","DETOUR","ESCAPE","FALLEN","FILTER","FROZEN","GEIGER","HAZARD","HELMET","IMPACT","INTAKE","JACKAL","LEGEND","MARKER","MUTANT","PLAGUE","POISON","PROTON","RADIUM","RANGER","RATION","REBOOT","RESCUE","ROCKET","RUBBLE","RUINED","SAVAGE","SCORCH","SECTOR","SECURE","SHADOW","SHRINE","SIGNAL","SILENT","SNIPER","TANKER","TARGET","THREAT","TOXINS","TREMOR","TUNNEL","VECTOR","VENDOR","WANDER","WARDEN","WEAPON","WINTER","ZEALOT"];
const WORD_LIST_7 = ["BLASTER","BROTHER","CAPITAL","CAUTION","CIRCUIT","CLEANUP","COMMAND","CONTROL","CORRODE","DEFENSE","DESTROY","DISEASE","DYNAMIC","EMITTER","EXPLODE","FALLOUT","FISSION","FORTIFY","FREEDOM","GUNFIRE","HOLDOUT","ISOTOPE","JOURNEY","LANTERN","MADNESS","MEGATON","MUTATED","NUCLEAR","OUTPOST","PROJECT","PROTECT","QUARTER","RADIATE","REACTOR","RECOVER","REFUGEE","SCANNER","SHELTER","SILICON","SOLDIER","STATION","SURFACE","SURVIVE","TRACKER","TROOPER","TWISTER","URANIUM","VENTURE","WARHEAD","WARRIOR","WARZONE","WHISPER"];

function getWordList(len: number) {
  return len === 4 ? WORD_LIST_4 : len === 5 ? WORD_LIST_5 : len === 6 ? WORD_LIST_6 : WORD_LIST_7;
}

type DiffKey = "easy" | "medium" | "hard" | "ultra";
const DIFFS: Record<DiffKey, { len: number; words: number; syms: number; labelKey: string }> = {
  easy:   { len: 4, words: 10, syms: 5, labelKey: "term.diff.easy" },
  medium: { len: 5, words: 12, syms: 6, labelKey: "term.diff.medium" },
  hard:   { len: 6, words: 14, syms: 7, labelKey: "term.diff.hard" },
  ultra:  { len: 7, words: 16, syms: 8, labelKey: "term.diff.ultra" },
};

function getLetterMatches(guess: string, answer: string): number {
  let count = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) count++;
  }
  return count;
}

function pickWords(answer: string, count: number, list: string[]): string[] {
  const filtered = list.filter(w => w !== answer && w.length === answer.length);
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return [answer, ...shuffled.slice(0, count - 1)].sort(() => Math.random() - 0.5);
}

type GameState = "menu" | "playing" | "won" | "lost";
type GuessEntry = { word: string; matches: number };

export default function TerminalHacker() {
  const { t, settings } = useApp();
  const tc = settings.theme === "amber" ? "#FFC000"
    : settings.theme === "blue" ? "#00CCFF"
    : settings.theme === "red" ? "#FF4444"
    : "#00FF00";
  const glow = `0 0 10px ${tc}`;
  const [gameState, setGameState] = useState<GameState>("menu");
  const [difficulty, setDifficulty] = useState<DiffKey>("easy");
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => getHighScore("terminal-streak"));
  const [newRecord, setNewRecord] = useState(false);
  const [answer, setAnswer] = useState("");
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [attemptsLeft, setAttemptsLeft] = useState(4);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [syms, setSyms] = useState<Sym[]>([]);
  const [memLines, setMemLines] = useState<MemLine[]>([]);
  const [dudWords, setDudWords] = useState<string[]>([]);
  const [secretFile, setSecretFile] = useState<typeof SECRET_FILES[0] | null>(null);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [terminalLog, setTerminalLog] = useState<string[]>([
    "> ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM",
    "> COPYRIGHT 2075-2077 ROBCO INDUSTRIES",
    "> -VAULT-TEC AUTHORIZED TERMINAL-",
    "> PLEASE STAND BY...",
    ">",
    "> ACCESS: HACK MODE ENGAGED",
    "> Select difficulty to begin password cracking.",
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [terminalLog, displayedLines]);

  const addLog = (line: string) => setTerminalLog(p => [...p, `> ${line}`]);

  const startGame = (diff: DiffKey) => {
    const cfg = DIFFS[diff];
    const list = getWordList(cfg.len);
    const ans = list[Math.floor(Math.random() * list.length)];
    const pool = pickWords(ans, cfg.words, list);
    setDifficulty(diff);
    setAnswer(ans);
    setWordPool(pool);
    setGuesses([]);
    setAttemptsLeft(4);
    setGameState("playing");
    setSecretFile(null);
    setNewRecord(false);
    setDisplayedLines([]);
    const mem = buildMemory(cfg.syms, 8);
    setSyms(mem.syms);
    setMemLines(mem.memLines);
    setDudWords([]);
    setTerminalLog([
      "> ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM",
      "> CRACKING VAULT-TEC ENCRYPTED DATABASE...",
      `> PASSWORD LENGTH: ${cfg.len} CHARACTERS`,
      "> ATTEMPTS REMAINING: ████████",
      ">",
      `> ${pool.length} POSSIBLE PASSWORDS IDENTIFIED`,
      "> Select a word to attempt password entry.",
    ]);
  };

  const handleGuess = useCallback((word: string) => {
    if (gameState !== "playing") return;
    const matches = getLetterMatches(word, answer);
    const newGuess = { word, matches };
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);

    if (word === answer) {
      const file = SECRET_FILES[Math.floor(Math.random() * SECRET_FILES.length)];
      setSecretFile(file);
      setGameState("won");
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const isRec = submitHighScore("terminal-streak", nextStreak, "max");
      setBestStreak(getHighScore("terminal-streak"));
      setNewRecord(isRec);
      addLog(`PASSWORD ACCEPTED: ${word}`);
      addLog(">>> ACCESS GRANTED <<<");
      addLog(`Decrypting ${file.filename}...`);
      // Typewriter reveal
      setTyping(true);
      let i = 0;
      const reveal = () => {
        if (i < file.content.length) {
          const lineText = file.content[i]; // capture by value before the async updater reads a mutated i
          setDisplayedLines(prev => [...prev, lineText]);
          i++;
          setTimeout(reveal, 120);
        } else {
          setTyping(false);
        }
      };
      setTimeout(reveal, 400);
      return;
    }

    const left = attemptsLeft - 1;
    setAttemptsLeft(left);
    addLog(`ENTRY DENIED: ${word} | LIKENESS: ${matches}/${word.length}`);

    if (left <= 0) {
      setGameState("lost");
      setStreak(0);
      addLog("TERMINAL LOCKED. MAXIMUM ATTEMPTS REACHED.");
      addLog(`The password was: ${answer}`);
    } else {
      addLog(`${left} ATTEMPT${left === 1 ? "" : "S"} REMAINING.`);
    }
  }, [gameState, answer, guesses, attemptsLeft, streak]);

  const handleSym = useCallback((id: number) => {
    if (gameState !== "playing") return;
    const s = syms.find(x => x.id === id);
    if (!s || s.used) return;
    setSyms(prev => prev.map(x => (x.id === id ? { ...x, used: true } : x)));
    if (s.effect === "reset") {
      setAttemptsLeft(4);
      addLog("!SECURITY BYPASS! ATTEMPTS REPLENISHED.");
    } else {
      const candidates = wordPool.filter(
        w => w !== answer && !dudWords.includes(w) && !guesses.some(g => g.word === w)
      );
      if (candidates.length === 0) {
        addLog("NO DUDS LEFT TO PURGE.");
      } else {
        const victim = candidates[Math.floor(Math.random() * candidates.length)];
        setDudWords(dw => [...dw, victim]);
        addLog(`DUD REMOVED: ${victim}`);
      }
    }
  }, [gameState, syms, wordPool, answer, dudWords, guesses]);

  const attemptsBar = "████".slice(0, attemptsLeft) + "░".repeat(Math.max(0, 4 - attemptsLeft));

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full max-w-3xl mx-auto">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: `${tc}b0` }}>Terminal Hacker v3.0</div>
        <div className="glow text-sm" style={{ color: tc }}>ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM</div>
        <div className="text-xs mt-1" style={{ color: `${tc}b0` }}>
          {t("term.streak")}: {streak} · {t("record.best")}: {bestStreak}
        </div>
      </div>

      {gameState === "menu" && (
        <div className="pipboy-border p-6 w-full text-center">
          <div className="text-lg mb-2 flicker" style={{ color: tc }}>{t("term.title")}</div>
          <div className="text-sm mb-6" style={{ color: tc }}>
            {t("term.intro")}
          </div>
          <div className="text-xs mb-4" style={{ color: `${tc}b0` }}>{t("term.difficulty")}</div>
          <div className="flex flex-col gap-2 items-center">
            {(Object.keys(DIFFS) as DiffKey[]).map(key => (
              <button key={key} className="pipboy-btn w-full max-w-xs" onClick={() => startGame(key)}>
                {t(DIFFS[key].labelKey)} <span style={{ color: `${tc}88` }}>· {DIFFS[key].len} {t("term.letters")} · {DIFFS[key].words} {t("term.words")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(gameState === "playing" || gameState === "won" || gameState === "lost") && (
        <div className="w-full flex flex-col gap-4">
        <div className="flex gap-4 w-full" style={{ flexWrap: "wrap" }}>
          {/* Word grid */}
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs mb-2" style={{ color: `${tc}b0` }}>{t("term.candidates")}</div>
            <div className="pipboy-border p-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
              {wordPool.map((word) => {
                const guessed = guesses.find(g => g.word === word);
                const isCorrect = word === answer && gameState === "won";
                const isDud = dudWords.includes(word);
                if (isDud) {
                  return (
                    <div key={word} className="text-left px-2 py-1 font-mono text-sm"
                      style={{ color: "#3a3a3a", border: "1px solid #1e1e1e", textDecoration: "line-through", cursor: "default" }}>
                      {".".repeat(word.length)}<span className="ml-2 text-green-900 text-xs">DUD</span>
                    </div>
                  );
                }
                return (
                  <button
                    key={word}
                    className="text-left px-2 py-1 font-mono text-sm transition-all"
                    style={{
                      background: isCorrect
                        ? `${tc}33`
                        : guessed
                        ? "rgba(255,100,0,0.1)"
                        : hoveredWord === word && gameState === "playing"
                        ? `${tc}1a`
                        : "transparent",
                      color: isCorrect
                        ? tc
                        : guessed
                        ? "#666"
                        : `${tc}dd`,
                      border: "1px solid",
                      borderColor: isCorrect
                        ? tc
                        : guessed
                        ? "#333"
                        : hoveredWord === word && gameState === "playing"
                        ? `${tc}88`
                        : "transparent",
                      cursor: guessed || gameState !== "playing" ? "default" : "pointer",
                      textShadow: isCorrect ? glow : "none",
                      textDecoration: guessed && !isCorrect ? "line-through" : "none",
                      opacity: guessed && !isCorrect ? 0.4 : 1,
                    }}
                    disabled={!!guessed || gameState !== "playing"}
                    onClick={() => handleGuess(word)}
                    onMouseEnter={() => setHoveredWord(word)}
                    onMouseLeave={() => setHoveredWord(null)}
                  >
                    {word}
                    {guessed && !isCorrect && (
                      <span className="ml-2 text-orange-400 text-xs">{guessed.matches}/{word.length}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {gameState === "playing" && (
              <div className="mt-3 text-xs" style={{ color: `${tc}cc` }}>
                <span>{t("term.attempts")} </span>
                <span className="font-mono" style={{ letterSpacing: "0.15em" }}>{attemptsBar}</span>
                <span className="ml-2" style={{ color: tc }}>{attemptsLeft}/4</span>
              </div>
            )}
          </div>

          {/* Terminal log */}
          <div className="flex-1 min-w-[240px]">
            <div className="text-xs mb-2" style={{ color: `${tc}b0` }}>{t("term.output")}</div>
            <div
              ref={logRef}
              className="pipboy-border p-3 font-mono text-xs overflow-y-auto"
              style={{ height: "280px", lineHeight: "1.6", color: tc }}
            >
              {terminalLog.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {gameState === "playing" && (
                <div>
                  &gt; {hoveredWord ? `TRY: ${hoveredWord}` : "_"}
                  <span className="cursor-blink">█</span>
                </div>
              )}
              {gameState === "won" && secretFile && (
                <div className="mt-2 border-t pt-2" style={{ borderColor: `${tc}44` }}>
                  <div className="mb-1" style={{ color: tc }}>--- {secretFile.filename} ---</div>
                  {displayedLines.map((line, i) => (
                    <div key={i} style={{ color: (line ?? "").startsWith(">>>") ? tc : `${tc}aa` }}>{line}</div>
                  ))}
                  {typing && <span className="cursor-blink">█</span>}
                </div>
              )}
            </div>

            {/* Guess history */}
            {guesses.length > 0 && (
              <div className="mt-2 text-xs" style={{ color: `${tc}99` }}>
                {guesses.map((g, i) => (
                  <div key={i}>
                    <span style={{ color: `${tc}cc` }}>{g.word}</span>
                    <span className="mx-2">→</span>
                    <span style={{ color: g.matches === answer.length ? tc : "#FF9933" }}>
                      {g.matches}/{answer.length} match{g.matches !== 1 ? "es" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {gameState === "won" && newRecord && (
              <div className="mt-3 glow text-sm flicker" style={{ color: tc }}>★ {t("record.new")} ★</div>
            )}

            {(gameState === "won" || gameState === "lost") && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <button className="pipboy-btn" onClick={() => startGame(difficulty)}>{t("term.tryagain")}</button>
                <button className="pipboy-btn" onClick={() => setGameState("menu")}>{t("term.menu")}</button>
              </div>
            )}
          </div>
        </div>

        {gameState === "playing" && memLines.length > 0 && (
          <div className="pipboy-border p-3 w-full">
            <div className="text-xs mb-2" style={{ color: `${tc}b0` }}>{t("term.symbols")}</div>
            <div className="font-mono text-xs" style={{ lineHeight: "1.9", wordBreak: "break-all" }}>
              {memLines.map((ln, i) => (
                <div key={i}>
                  <span className="mr-2 select-none" style={{ color: `${tc}55` }}>{ln.addr}</span>
                  {ln.parts.map((p, j) => {
                    if (p.kind === "junk") return <span key={j} className="select-none" style={{ color: `${tc}44` }}>{p.text}</span>;
                    const s = syms.find(x => x.id === p.id)!;
                    return (
                      <button key={j} disabled={s.used} onClick={() => handleSym(p.id)}
                        className="mx-1 font-mono"
                        style={{
                          color: s.used ? "#333" : tc,
                          textShadow: s.used ? "none" : glow,
                          textDecoration: s.used ? "line-through" : "none",
                          cursor: s.used ? "default" : "pointer",
                        }}>
                        {s.cluster}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="text-xs mt-2" style={{ color: `${tc}88` }}>{t("term.symhint")}</div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
