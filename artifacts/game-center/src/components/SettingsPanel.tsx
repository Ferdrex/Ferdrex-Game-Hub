import { useApp, Theme, Language } from "../context/AppContext";

const THEMES: { id: Theme; label: string; color: string }[] = [
  { id: "green", label: "GREEN", color: "#00FF00" },
  { id: "amber", label: "AMBER", color: "#FFC000" },
  { id: "blue", label: "BLUE", color: "#00CCFF" },
  { id: "red", label: "RED", color: "#FF4444" },
];

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { t, settings, setLanguage, setTheme, setScale } = useApp();

  const tc = settings.theme === "amber" ? "#FFC000"
    : settings.theme === "blue" ? "#00CCFF"
    : settings.theme === "red" ? "#FF4444"
    : "#00FF00";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
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
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-bold" style={{ color: tc, textShadow: `0 0 8px ${tc}` }}>
            ⚙ {t("menu.settings")}
          </div>
          <button className="pipboy-btn text-xs py-1 px-3" onClick={onClose}>
            ✕ {t("menu.close")}
          </button>
        </div>

        {/* Language */}
        <div className="mb-5">
          <div className="text-xs mb-2" style={{ color: `${tc}aa` }}>{t("menu.language").toUpperCase()}</div>
          <div className="flex gap-2">
            {(["en", "es"] as Language[]).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className="pipboy-btn text-xs flex-1 py-2"
                style={{
                  background: settings.language === lang ? `${tc}22` : "transparent",
                  borderColor: settings.language === lang ? tc : `${tc}44`,
                  color: settings.language === lang ? tc : `${tc}88`,
                  boxShadow: settings.language === lang ? `0 0 8px ${tc}44` : "none",
                }}
              >
                {lang === "en" ? "ENGLISH" : "ESPAÑOL"}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="mb-5">
          <div className="text-xs mb-2" style={{ color: `${tc}aa` }}>{t("menu.theme").toUpperCase()}</div>
          <div className="grid grid-cols-4 gap-2">
            {THEMES.map(th => (
              <button
                key={th.id}
                onClick={() => setTheme(th.id)}
                className="py-2 text-xs font-mono transition-all"
                style={{
                  border: `1px solid ${settings.theme === th.id ? th.color : `${th.color}44`}`,
                  background: settings.theme === th.id ? `${th.color}22` : "transparent",
                  color: th.color,
                  boxShadow: settings.theme === th.id ? `0 0 8px ${th.color}55` : "none",
                }}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>

        {/* Display size */}
        <div className="mb-5">
          <div className="text-xs mb-2" style={{ color: `${tc}aa` }}>{t("menu.scale").toUpperCase()}</div>
          <div className="flex gap-2">
            {(["desktop", "mobile"] as const).map(sc => (
              <button
                key={sc}
                onClick={() => setScale(sc)}
                className="pipboy-btn text-xs flex-1 py-2"
                style={{
                  background: settings.scale === sc ? `${tc}22` : "transparent",
                  borderColor: settings.scale === sc ? tc : `${tc}44`,
                  color: settings.scale === sc ? tc : `${tc}88`,
                  boxShadow: settings.scale === sc ? `0 0 8px ${tc}44` : "none",
                }}
              >
                {sc === "desktop" ? t("menu.desktop").toUpperCase() : t("menu.mobile").toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-center mt-4" style={{ color: `${tc}44` }}>
          DREX ARCADE v4.2.0 — FERDREX GAME STUDIOS
        </div>
      </div>
    </div>
  );
}
