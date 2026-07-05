import { useState, useCallback, useEffect, useRef } from "react";

// Game configuration
const player_speed = 5;
const enemy_spawn_rate = 1.2;
const theme_glow = "0 0 10px #00FF00";

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

function getWordList(len: number) {
  return len === 4 ? WORD_LIST_4 : WORD_LIST_5;
}

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
  const [gameState, setGameState] = useState<GameState>("menu");
  const [difficulty, setDifficulty] = useState<4|5>(4);
  const [answer, setAnswer] = useState("");
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [attemptsLeft, setAttemptsLeft] = useState(4);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
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

  const startGame = (diff: 4|5) => {
    const list = getWordList(diff);
    const ans = list[Math.floor(Math.random() * list.length)];
    const pool = pickWords(ans, diff === 4 ? 12 : 10, list);
    setDifficulty(diff);
    setAnswer(ans);
    setWordPool(pool);
    setGuesses([]);
    setAttemptsLeft(4);
    setGameState("playing");
    setSecretFile(null);
    setDisplayedLines([]);
    setTerminalLog([
      "> ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM",
      "> CRACKING VAULT-TEC ENCRYPTED DATABASE...",
      `> PASSWORD LENGTH: ${diff} CHARACTERS`,
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
      addLog(`PASSWORD ACCEPTED: ${word}`);
      addLog(">>> ACCESS GRANTED <<<");
      addLog(`Decrypting ${file.filename}...`);
      // Typewriter reveal
      setTyping(true);
      let i = 0;
      const reveal = () => {
        if (i < file.content.length) {
          setDisplayedLines(prev => [...prev, file.content[i]]);
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
      addLog("TERMINAL LOCKED. MAXIMUM ATTEMPTS REACHED.");
      addLog(`The password was: ${answer}`);
    } else {
      addLog(`${left} ATTEMPT${left === 1 ? "" : "S"} REMAINING.`);
    }
  }, [gameState, answer, guesses, attemptsLeft]);

  const attemptsBar = "████".slice(0, attemptsLeft) + "░".repeat(Math.max(0, 4 - attemptsLeft));

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full max-w-3xl mx-auto">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-green-500/70 mb-1">Terminal Hacker v3.0</div>
        <div className="glow text-green-400 text-sm">ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM</div>
      </div>

      {gameState === "menu" && (
        <div className="pipboy-border p-6 w-full text-center">
          <div className="text-green-400 text-lg mb-2 flicker">VAULT-TEC TERMINAL</div>
          <div className="text-green-300 text-sm mb-6">
            Crack the password to unlock a classified file about TOTITO.
            You get 4 attempts. After each guess you see how many letters match exactly.
          </div>
          <div className="text-green-500/70 text-xs mb-4">SELECT DIFFICULTY:</div>
          <div className="flex gap-4 justify-center">
            <button className="pipboy-btn" onClick={() => startGame(4)}>[ 4-LETTER WORDS ]</button>
            <button className="pipboy-btn" onClick={() => startGame(5)}>[ 5-LETTER WORDS ]</button>
          </div>
        </div>
      )}

      {(gameState === "playing" || gameState === "won" || gameState === "lost") && (
        <div className="flex gap-4 w-full" style={{ flexWrap: "wrap" }}>
          {/* Word grid */}
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs text-green-500/70 mb-2">PASSWORD CANDIDATES:</div>
            <div className="pipboy-border p-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
              {wordPool.map((word) => {
                const guessed = guesses.find(g => g.word === word);
                const isCorrect = word === answer && gameState === "won";
                return (
                  <button
                    key={word}
                    className="text-left px-2 py-1 font-mono text-sm transition-all"
                    style={{
                      background: isCorrect
                        ? "rgba(0,255,0,0.2)"
                        : guessed
                        ? "rgba(255,100,0,0.1)"
                        : hoveredWord === word && gameState === "playing"
                        ? "rgba(0,255,0,0.1)"
                        : "transparent",
                      color: isCorrect
                        ? "#00FF00"
                        : guessed
                        ? "#666"
                        : "#00DD00",
                      border: "1px solid",
                      borderColor: isCorrect
                        ? "#00FF00"
                        : guessed
                        ? "#333"
                        : hoveredWord === word && gameState === "playing"
                        ? "rgba(0,255,0,0.5)"
                        : "transparent",
                      cursor: guessed || gameState !== "playing" ? "default" : "pointer",
                      textShadow: isCorrect ? theme_glow : "none",
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
              <div className="mt-3 text-xs text-green-500">
                <span>ATTEMPTS: </span>
                <span className="font-mono" style={{ letterSpacing: "0.15em" }}>{attemptsBar}</span>
                <span className="ml-2 text-green-400">{attemptsLeft}/4</span>
              </div>
            )}
          </div>

          {/* Terminal log */}
          <div className="flex-1 min-w-[240px]">
            <div className="text-xs text-green-500/70 mb-2">TERMINAL OUTPUT:</div>
            <div
              ref={logRef}
              className="pipboy-border p-3 font-mono text-xs text-green-400 overflow-y-auto"
              style={{ height: "280px", lineHeight: "1.6" }}
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
                <div className="mt-2 border-t border-green-800 pt-2">
                  <div className="text-green-300 mb-1">--- {secretFile.filename} ---</div>
                  {displayedLines.map((line, i) => (
                    <div key={i} style={{ color: line.startsWith(">>>") ? "#00FF00" : "#99cc99" }}>{line}</div>
                  ))}
                  {typing && <span className="cursor-blink">█</span>}
                </div>
              )}
            </div>

            {/* Guess history */}
            {guesses.length > 0 && (
              <div className="mt-2 text-xs text-green-600">
                {guesses.map((g, i) => (
                  <div key={i}>
                    <span className="text-green-500">{g.word}</span>
                    <span className="mx-2">→</span>
                    <span className={g.matches === answer.length ? "text-green-300" : "text-orange-400"}>
                      {g.matches}/{answer.length} match{g.matches !== 1 ? "es" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(gameState === "won" || gameState === "lost") && (
              <div className="mt-3 flex gap-2">
                <button className="pipboy-btn" onClick={() => startGame(difficulty)}>[ TRY AGAIN ]</button>
                <button className="pipboy-btn" onClick={() => setGameState("menu")}>[ MENU ]</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
