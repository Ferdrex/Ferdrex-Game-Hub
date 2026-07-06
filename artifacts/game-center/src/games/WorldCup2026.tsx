import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { submitPrediction } from "../lib/predictions";

// Teams still alive in the tournament (update as matches are played).
// Eliminated so far: México (lost 2-3 to Inglaterra).
const TEAMS = [
  "Inglaterra", "Portugal", "España", "Estados Unidos", "Bélgica",
  "Argentina", "Egipto", "Suiza", "Colombia", "Francia", "Marruecos",
];

// Forecaster analysis + fixtures. probA = forecaster's estimated chance team A wins.
// result: "A" if team a won, "B" if team b won, null while the match is not played.
// To settle bets, set the real result here and push (bets grade on next load).
type MatchResult = "A" | "B" | null;
type Match = { id: string; a: string; b: string; probA: number; score: string; es: string; en: string; result: MatchResult };
const MATCHES: Match[] = [
  { id: "r16-por-esp", a: "Portugal", b: "España", probA: 0.47, score: "1-2", result: null,
    es: "Derbi ibérico. España domina la posesión y el mediocampo; Portugal es letal a la contra con sus figuras. Ligera ventaja española.",
    en: "Iberian derby. Spain controls possession and midfield; Portugal is lethal on the break. Slight edge to Spain." },
  { id: "r16-usa-bel", a: "Estados Unidos", b: "Bélgica", probA: 0.45, score: "1-2", result: null,
    es: "Bélgica llega con más jerarquía individual; EE.UU. empuja con el impulso de jugar en casa. Los belgas parten ligeramente favoritos.",
    en: "Belgium brings more individual pedigree; the USA rides home-crowd energy. Belgium are slight favorites." },
  { id: "r16-arg-egi", a: "Argentina", b: "Egipto", probA: 0.78, score: "3-0", result: null,
    es: "La campeona vigente es muy superior en plantel y ritmo. Egipto resistirá con orden, pero la diferencia de nivel debería pesar.",
    en: "The reigning champion is far superior in depth and tempo. Egypt will sit deep, but the gap in quality should tell." },
  { id: "r16-sui-col", a: "Suiza", b: "Colombia", probA: 0.45, score: "1-2", result: null,
    es: "Suiza sólida y ordenada frente a una Colombia con más chispa ofensiva. Los cafeteros parten ligeramente por delante.",
    en: "Solid, disciplined Switzerland against a more creative Colombia. The Colombians start marginally ahead." },
  { id: "qf-fra-mar", a: "Francia", b: "Marruecos", probA: 0.62, score: "2-1", result: null,
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

// Pending bets, keyed by match id. Stake is deducted when placed; a winning
// bet pays stake*odds when the match result comes in.
const BETS_KEY = "wc-bets";
type Bet = { side: "A" | "B"; stake: number; odds: number; settled: boolean };
type BetMap = Record<string, Bet>;
function loadBets(): BetMap {
  try { const raw = localStorage.getItem(BETS_KEY); return raw ? JSON.parse(raw) as BetMap : {}; }
  catch { return {}; }
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
  const [bets, setBets] = useState<BetMap>(loadBets);

  useEffect(() => {
    try { localStorage.setItem(CAPS_KEY, String(caps)); } catch { /* ignore */ }
  }, [caps]);
  useEffect(() => {
    try { localStorage.setItem(BETS_KEY, JSON.stringify(bets)); } catch { /* ignore */ }
  }, [bets]);

  // Settle any pending bet whose match now has a result (runs on load).
  useEffect(() => {
    let payout = 0;
    let changed = false;
    const next: BetMap = { ...bets };
    for (const m of MATCHES) {
      const b = next[m.id];
      if (b && !b.settled && m.result) {
        if (b.side === m.result) payout += Math.round(b.stake * b.odds);
        next[m.id] = { ...b, settled: true };
        changed = true;
      }
    }
    if (changed) {
      setBets(next);
      if (payout > 0) setCaps(c => c + payout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placeBet = (m: Match, side: "A" | "B") => {
    if (bets[m.id] || m.result || caps < bet) return;
    const odds = side === "A" ? 1 / m.probA : 1 / (1 - m.probA);
    setCaps(c => c - bet);
    setBets(bs => ({ ...bs, [m.id]: { side, stake: bet, odds, settled: false } }));
  };

  const resetAll = () => { setCaps(START_CAPS); setBets({}); };

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

      <div className="text-xs text-center px-2" style={{ color: `${tc}77` }}>{t("fc.howto")}</div>

      {caps < CHIPS[0] && (
        <div className="text-center flex flex-col items-center gap-2 py-2">
          <div className="text-sm" style={{ color: "#FF6666" }}>{t("fc.broke")}</div>
          <button className="pipboy-btn text-xs" onClick={resetAll}>{t("fc.reset")}</button>
        </div>
      )}

      {/* Matches */}
      {MATCHES.map((m) => {
        const oddsA = (1 / m.probA).toFixed(2);
        const oddsB = (1 / (1 - m.probA)).toFixed(2);
        const b = bets[m.id];
        const played = m.result !== null;
        const won = !!b && !!m.result && b.side === m.result;
        return (
          <div key={m.id} className="pipboy-border p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-mono text-sm" style={{ color: tc }}>{m.a} vs {m.b}</span>
              <span className="text-xs" style={{ color: `${tc}88` }}>
                {played ? `${t("fc.result")}: ${m.result === "A" ? m.a : m.b}` : `${t("fc.predicted")}: ${m.score}`}
              </span>
            </div>
            <div className="text-xs" style={{ color: `${tc}aa` }}>{settings.language === "es" ? m.es : m.en}</div>

            {/* No bet yet + not played → allow betting */}
            {!b && !played && (
              <div className="flex gap-2">
                <button className="pipboy-btn text-xs flex-1 py-2" disabled={caps < bet}
                  onClick={() => placeBet(m, "A")}>
                  {m.a} <span style={{ color: `${tc}88` }}>({oddsA}x)</span>
                </button>
                <button className="pipboy-btn text-xs flex-1 py-2" disabled={caps < bet}
                  onClick={() => placeBet(m, "B")}>
                  {m.b} <span style={{ color: `${tc}88` }}>({oddsB}x)</span>
                </button>
              </div>
            )}

            {/* Bet placed, awaiting result */}
            {b && !played && (
              <div className="text-xs text-center flex items-center justify-center gap-1" style={{ color: tc }}>
                ⏳ {t("fc.youbet")}: {b.stake} 🔩 → {b.side === "A" ? m.a : m.b} ({b.odds.toFixed(2)}x) · <span style={{ color: `${tc}88` }}>{t("fc.awaiting")}</span>
              </div>
            )}

            {/* Settled */}
            {b && played && (
              <div className="text-xs text-center" style={{ color: won ? tc : "#FF6666" }}>
                {won ? `✓ ${t("fc.win")} +${Math.round(b.stake * b.odds - b.stake)} 🔩` : `✗ ${t("fc.lose")} -${b.stake} 🔩`}
              </div>
            )}

            {/* Played but user didn't bet */}
            {!b && played && (
              <div className="text-xs text-center" style={{ color: `${tc}55` }}>{t("fc.nobet")}</div>
            )}
          </div>
        );
      })}

      <div className="flex justify-center">
        <button className="pipboy-btn text-xs" onClick={resetAll}>{t("fc.reset")}</button>
      </div>
      <div className="text-xs text-center px-2" style={{ color: `${tc}66` }}>{t("fc.disclaimer")}</div>
    </div>
  );
}
