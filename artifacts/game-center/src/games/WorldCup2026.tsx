import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { submitPrediction } from "../lib/predictions";

// Teams still alive in the tournament (update as matches are played).
// Eliminated so far: México (lost 2-3 to Inglaterra).
const TEAMS = [
  "Inglaterra", "Portugal", "España", "Estados Unidos", "Bélgica",
  "Argentina", "Egipto", "Suiza", "Colombia", "Francia", "Marruecos",
];

// Forecaster analysis — illustrative match-ups the user can edit.
// probA = the forecaster's estimated chance team A wins.
type Match = { a: string; b: string; probA: number; score: string; es: string; en: string };
const MATCHES: Match[] = [
  { a: "Portugal", b: "España", probA: 0.47, score: "1-2",
    es: "Derbi ibérico. España domina la posesión y el mediocampo; Portugal es letal a la contra con sus figuras. Ligera ventaja española.",
    en: "Iberian derby. Spain controls possession and midfield; Portugal is lethal on the break. Slight edge to Spain." },
  { a: "Estados Unidos", b: "Bélgica", probA: 0.45, score: "1-2",
    es: "Bélgica llega con más jerarquía individual; EE.UU. empuja con el impulso de jugar en casa. Los belgas parten ligeramente favoritos.",
    en: "Belgium brings more individual pedigree; the USA rides home-crowd energy. Belgium are slight favorites." },
  { a: "Argentina", b: "Egipto", probA: 0.78, score: "3-0",
    es: "La campeona vigente es muy superior en plantel y ritmo. Egipto resistirá con orden, pero la diferencia de nivel debería pesar.",
    en: "The reigning champion is far superior in depth and tempo. Egypt will sit deep, but the gap in quality should tell." },
  { a: "Suiza", b: "Colombia", probA: 0.45, score: "1-2",
    es: "Suiza sólida y ordenada frente a una Colombia con más chispa ofensiva. Los cafeteros parten ligeramente por delante.",
    en: "Solid, disciplined Switzerland against a more creative Colombia. The Colombians start marginally ahead." },
  { a: "Francia", b: "Marruecos", probA: 0.62, score: "2-1",
    es: "Reedición de la semifinal 2022. Francia tiene más pegada arriba; Marruecos, una muralla defensiva y contragolpe veloz. Francia favorita, pero ojo.",
    en: "A rematch of the 2022 semifinal. France has more firepower; Morocco a defensive wall and fast counters. France favored, but beware." },
];

const CAPS_KEY = "wc-caps";
const START_CAPS = 1000;
const CHIPS = [10, 50, 100, 500];

function loadCaps(): number {
  try {
    const raw = localStorage.getItem(CAPS_KEY);
    if (raw == null) return START_CAPS;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : START_CAPS;
  } catch { return START_CAPS; }
}

// Fire an anonymous analytics event (only the picks, never the name).
function trackSubmission(champion: string, runner_up: string, top_scorer: string) {
  const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof gtag === "function") gtag("event", "prediction_submitted", { champion, runner_up, top_scorer });
}

export default function WorldCup2026() {
  const { t, settings } = useApp();
  const tc = settings.theme === "amber" ? "#FFC000"
    : settings.theme === "blue" ? "#00CCFF"
    : settings.theme === "red" ? "#FF4444"
    : "#00FF00";

  const [tab, setTab] = useState<"quiniela" | "forecast">("quiniela");

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full max-w-md mx-auto">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: `${tc}b0` }}>Ferdrex Sports</div>
        <div className="glow text-lg font-mono" style={{ color: tc }}>⚽ {t("wc.header")}</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 w-full">
        {(["quiniela", "forecast"] as const).map(id => (
          <button key={id} onClick={() => setTab(id)}
            className="pipboy-btn text-xs flex-1 py-2"
            style={{
              background: tab === id ? `${tc}22` : "transparent",
              borderColor: tab === id ? tc : `${tc}44`,
              color: tab === id ? tc : `${tc}88`,
              boxShadow: tab === id ? `0 0 8px ${tc}44` : "none",
            }}>
            {id === "quiniela" ? t("wc.tab.quiniela") : t("wc.tab.forecast")}
          </button>
        ))}
      </div>

      {tab === "quiniela" ? <QuinielaForm tc={tc} /> : <Forecaster tc={tc} />}
    </div>
  );
}

function QuinielaForm({ tc }: { tc: string }) {
  const { t } = useApp();
  const [name, setName] = useState("");
  const [champion, setChampion] = useState("");
  const [runnerUp, setRunnerUp] = useState("");
  const [scorer, setScorer] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [warn, setWarn] = useState("");

  const fieldStyle = { border: `1px solid ${tc}55`, color: tc, background: "#020a02" } as const;

  const reset = () => { setName(""); setChampion(""); setRunnerUp(""); setScorer(""); setState("idle"); setWarn(""); };

  const handleSubmit = async () => {
    setWarn("");
    if (!name.trim() || !champion || !runnerUp || !scorer.trim()) { setWarn(t("qn.required")); return; }
    if (champion === runnerUp) { setWarn(t("qn.samewarn")); return; }
    setState("sending");
    const ok = await submitPrediction({ name, champion, runner_up: runnerUp, top_scorer: scorer });
    if (ok) { trackSubmission(champion, runnerUp, scorer); setState("done"); }
    else setState("error");
  };

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-4 w-full text-center">
        <div className="glow text-xl font-mono flicker" style={{ color: tc }}>🏆 {t("qn.success")}</div>
        <div className="pipboy-border p-4 w-full text-sm" style={{ color: tc }}>
          <div className="mb-2" style={{ color: `${tc}aa` }}>{name}</div>
          <div className="flex justify-between py-1"><span style={{ color: `${tc}88` }}>{t("qn.champion")}</span><span>{champion}</span></div>
          <div className="flex justify-between py-1"><span style={{ color: `${tc}88` }}>{t("qn.runnerup")}</span><span>{runnerUp}</span></div>
          <div className="flex justify-between py-1"><span style={{ color: `${tc}88` }}>{t("qn.scorer")}</span><span>{scorer}</span></div>
        </div>
        <button className="pipboy-btn" onClick={reset}>{t("qn.again")}</button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="text-xs text-center" style={{ color: `${tc}99` }}>{t("qn.intro")}</div>
      <div className="w-full flex flex-col gap-4 pipboy-border p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: `${tc}aa` }}>{t("qn.name")}</span>
          <input value={name} onChange={e => setName(e.target.value.slice(0, 24))} maxLength={24}
            placeholder={t("qn.name_ph")} className="px-3 py-2 text-sm font-mono outline-none" style={fieldStyle} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: `${tc}aa` }}>🏆 {t("qn.champion")}</span>
          <select value={champion} onChange={e => setChampion(e.target.value)}
            className="px-3 py-2 text-sm font-mono outline-none" style={fieldStyle}>
            <option value="">{t("qn.pick")}</option>
            {TEAMS.map(tm => <option key={tm} value={tm}>{tm}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: `${tc}aa` }}>🥈 {t("qn.runnerup")}</span>
          <select value={runnerUp} onChange={e => setRunnerUp(e.target.value)}
            className="px-3 py-2 text-sm font-mono outline-none" style={fieldStyle}>
            <option value="">{t("qn.pick")}</option>
            {TEAMS.map(tm => <option key={tm} value={tm}>{tm}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: `${tc}aa` }}>⚽ {t("qn.scorer")}</span>
          <input value={scorer} onChange={e => setScorer(e.target.value.slice(0, 40))} maxLength={40}
            placeholder={t("qn.scorer_ph")} className="px-3 py-2 text-sm font-mono outline-none" style={fieldStyle} />
        </label>
        {warn && <div className="text-xs" style={{ color: "#FF6666" }}>{warn}</div>}
        {state === "error" && <div className="text-xs" style={{ color: "#FF6666" }}>{t("qn.error")}</div>}
        <button className="pipboy-btn" onClick={handleSubmit} disabled={state === "sending"}>
          {state === "sending" ? t("qn.sending") : t("qn.submit")}
        </button>
      </div>
      <div className="text-xs text-center px-2" style={{ color: `${tc}66` }}>{t("qn.privacy")}</div>
    </div>
  );
}

function Forecaster({ tc }: { tc: string }) {
  const { t, settings } = useApp();
  const [caps, setCaps] = useState(loadCaps);
  const [bet, setBet] = useState(50);
  const [results, setResults] = useState<Record<number, { won: boolean; team: string; delta: number }>>({});

  useEffect(() => {
    try { localStorage.setItem(CAPS_KEY, String(caps)); } catch { /* ignore */ }
  }, [caps]);

  const placeBet = (idx: number, m: Match, onA: boolean) => {
    if (caps < bet) return;
    const oddsA = 1 / m.probA;
    const oddsB = 1 / (1 - m.probA);
    const teamAWins = Math.random() < m.probA;
    const userWon = onA === teamAWins;
    const odds = onA ? oddsA : oddsB;
    const team = onA ? m.a : m.b;
    const delta = userWon ? Math.round(bet * odds) - bet : -bet;
    setCaps(c => Math.max(0, c + delta));
    setResults(r => ({ ...r, [idx]: { won: userWon, team, delta } }));
  };

  const resetCaps = () => { setCaps(START_CAPS); setResults({}); };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Balance + chips */}
      <div className="pipboy-border p-3 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: `${tc}aa` }}>{t("fc.balance")}</span>
          <span className="glow font-mono text-lg" style={{ color: tc }}>🔩 {caps}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: `${tc}aa` }}>{t("fc.bet")}</span>
          <div className="flex gap-1">
            {CHIPS.map(c => (
              <button key={c} onClick={() => setBet(c)}
                className="text-xs font-mono px-2 py-1"
                style={{
                  border: `1px solid ${bet === c ? tc : `${tc}44`}`,
                  background: bet === c ? `${tc}22` : "transparent",
                  color: bet === c ? tc : `${tc}88`,
                }}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      {caps < CHIPS[0] && (
        <div className="text-center flex flex-col items-center gap-2 py-2">
          <div className="text-sm" style={{ color: "#FF6666" }}>{t("fc.broke")}</div>
          <button className="pipboy-btn text-xs" onClick={resetCaps}>{t("fc.reset")}</button>
        </div>
      )}

      {/* Matches */}
      {MATCHES.map((m, idx) => {
        const oddsA = (1 / m.probA).toFixed(2);
        const oddsB = (1 / (1 - m.probA)).toFixed(2);
        const res = results[idx];
        return (
          <div key={idx} className="pipboy-border p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-mono text-sm" style={{ color: tc }}>{m.a} vs {m.b}</span>
              <span className="text-xs" style={{ color: `${tc}88` }}>{t("fc.predicted")}: {m.score}</span>
            </div>
            <div className="text-xs" style={{ color: `${tc}aa` }}>{settings.language === "es" ? m.es : m.en}</div>
            <div className="flex gap-2">
              <button className="pipboy-btn text-xs flex-1 py-2" disabled={caps < bet}
                onClick={() => placeBet(idx, m, true)}>
                {m.a} <span style={{ color: `${tc}88` }}>({oddsA}x)</span>
              </button>
              <button className="pipboy-btn text-xs flex-1 py-2" disabled={caps < bet}
                onClick={() => placeBet(idx, m, false)}>
                {m.b} <span style={{ color: `${tc}88` }}>({oddsB}x)</span>
              </button>
            </div>
            {res && (
              <div className="text-xs text-center" style={{ color: res.won ? tc : "#FF6666" }}>
                {res.won ? `✓ ${t("fc.win")} +${res.delta} 🔩` : `✗ ${t("fc.lose")} ${res.delta} 🔩`}
              </div>
            )}
          </div>
        );
      })}

      <div className="text-xs text-center px-2" style={{ color: `${tc}66` }}>{t("fc.disclaimer")}</div>
    </div>
  );
}
