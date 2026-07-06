import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { getTopScores, submitScore, type ScoreRow } from "../lib/leaderboard";

type Props = {
  game: string;         // stable id used as the leaderboard key (e.g. "runner")
  title: string;        // display title (e.g. "RADIATION RUNNER")
  score?: number;       // the score the player just achieved (optional)
  onClose: () => void;
};

export default function Leaderboard({ game, title, score, onClose }: Props) {
  const { t, settings } = useApp();
  const tc = settings.theme === "amber" ? "#FFC000"
    : settings.theme === "blue" ? "#00CCFF"
    : settings.theme === "red" ? "#FF4444"
    : "#00FF00";

  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const load = async () => {
    setRows(null);
    setRows(await getTopScores(game, 10));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [game]);

  const canSubmit = typeof score === "number" && score > 0 && state !== "done";

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setState("sending");
    const ok = await submitScore(game, name || "ANON", score!);
    if (ok) {
      setState("done");
      await load();
    } else {
      setState("error");
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm p-6 font-mono"
        style={{
          background: "hsl(120 100% 4%)",
          border: `1px solid ${tc}55`,
          boxShadow: `0 0 30px ${tc}22, inset 0 0 20px rgba(0,0,0,0.5)`,
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-bold" style={{ color: tc, textShadow: `0 0 8px ${tc}` }}>
            🏆 {t("lb.title")}
          </div>
          <button className="pipboy-btn text-xs py-1 px-3" onClick={onClose}>
            ✕ {t("lb.close")}
          </button>
        </div>

        <div className="text-xs mb-3" style={{ color: `${tc}aa` }}>{title}</div>

        {/* Submit row */}
        {canSubmit && (
          <div className="mb-4 pb-4" style={{ borderBottom: `1px solid ${tc}33` }}>
            <div className="text-xs mb-2" style={{ color: `${tc}aa` }}>
              {t("lb.you")}: <span style={{ color: tc }}>{score}</span>
            </div>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={e => setName(e.target.value.slice(0, 12))}
                placeholder={t("lb.yourname")}
                maxLength={12}
                className="flex-1 px-2 py-2 text-xs font-mono bg-transparent outline-none"
                style={{ border: `1px solid ${tc}44`, color: tc }}
              />
              <button
                className="pipboy-btn text-xs py-2 px-3"
                onClick={handleSubmit}
                disabled={state === "sending"}
              >
                {state === "sending" ? t("lb.submitting") : t("lb.submit")}
              </button>
            </div>
            {state === "error" && (
              <div className="text-xs mt-2" style={{ color: "#FF6666" }}>{t("lb.error")}</div>
            )}
          </div>
        )}

        {state === "done" && (
          <div className="text-xs mb-3 flicker" style={{ color: tc }}>✓ {t("lb.submitted")}</div>
        )}

        {/* Ranking list */}
        {rows === null ? (
          <div className="text-xs py-4 text-center" style={{ color: `${tc}88` }}>{t("lb.loading")}</div>
        ) : rows.length === 0 ? (
          <div className="text-xs py-4 text-center" style={{ color: `${tc}88` }}>{t("lb.empty")}</div>
        ) : (
          <div className="flex flex-col gap-1">
            {rows.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs py-1 px-2"
                style={{ background: i % 2 === 0 ? `${tc}0a` : "transparent" }}
              >
                <span style={{ color: `${tc}88`, width: "1.5rem" }}>{i + 1}.</span>
                <span className="flex-1 truncate" style={{ color: tc }}>{r.name}</span>
                <span style={{ color: tc, textShadow: i === 0 ? `0 0 6px ${tc}` : "none" }}>{r.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
