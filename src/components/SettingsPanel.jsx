import {
  CONNECTION_MODES,
  detectAuthType,
  maskAuth,
} from "../api/tmdbClient.js";
import { Pill } from "./ui.jsx";

export function SettingsPanel({
  auth,
  savedAuth,
  showAuth,
  onShowAuthChange,
  onAuthChange,
  onSaveAuth,
  onClearAuth,
  connectionMode,
  onConnectionModeChange,
  proxyConfigured,
  taxaCount,
  taxaMeta,
  taxaLoading,
  onRefreshTaxa,
  onClearAll,
  resultCount,
  overlapCount,
  activeSource,
  connectionReady,
}) {
  const authType = detectAuthType(auth);
  const unsaved = Boolean(auth.trim()) && auth.trim() !== savedAuth;

  const sourceLabel = {
    proxy: "Proxy",
    direct: "Direkte TMDB",
    "direct-fallback": "Direkte fallback",
  }[activeSource];

  return (
    <aside className="rounded-2xl bg-slate-800/60 p-4 shadow">
      <h2 className="mb-2 text-lg font-medium">Forbindelse og status</h2>

      <div className="space-y-3 text-sm">
        <div className="rounded-xl bg-slate-900/40 p-3 ring-1 ring-slate-700">
          <label htmlFor="connection-mode" className="mb-1 block font-medium">
            Forbindelse
          </label>
          <select
            id="connection-mode"
            className="w-full rounded-xl bg-slate-900 px-3 py-2 ring-1 ring-slate-700"
            value={connectionMode}
            onChange={(event) => onConnectionModeChange(event.target.value)}
          >
            {proxyConfigured && (
              <option value={CONNECTION_MODES.AUTO}>
                Automatisk: proxy med egen nøgle som fallback
              </option>
            )}
            {proxyConfigured && (
              <option value={CONNECTION_MODES.PROXY}>Kun proxy</option>
            )}
            <option value={CONNECTION_MODES.DIRECT}>
              Direkte med egen TMDB-nøgle
            </option>
          </select>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
            <Pill>{proxyConfigured ? "Proxy konfigureret" : "Ingen proxy"}</Pill>
            <Pill>{connectionReady ? "Klar" : "Mangler konfiguration"}</Pill>
            {sourceLabel && <Pill title="Seneste datakilde">{sourceLabel}</Pill>}
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/40 p-3 ring-1 ring-slate-700">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-medium">Egen API-nøgle / token</div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs ring-1 ring-slate-700 hover:ring-sky-500"
              onClick={() => onShowAuthChange(!showAuth)}
            >
              {showAuth ? "Skjul" : "Vis"}
            </button>
          </div>

          <div className="mb-2 break-all text-slate-300">
            {showAuth ? auth || "(ingen gemt)" : maskAuth(auth)}
          </div>

          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
            <span>Type:</span>
            {authType === "v4-bearer" && <Pill>v4 Bearer</Pill>}
            {authType === "v3-apikey" && <Pill>v3 API key</Pill>}
            {authType === "none" && <Pill>(ukendt)</Pill>}
          </div>

          <input
            aria-label="TMDB API-nøgle eller Bearer-token"
            type={showAuth ? "text" : "password"}
            autoComplete="off"
            spellCheck="false"
            className="w-full rounded-xl bg-slate-900 px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
            placeholder="v4 Bearer-token eller v3 api_key"
            value={auth}
            onChange={(event) => onAuthChange(event.target.value)}
          />

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-3 py-1.5 ring-1 ring-slate-700 hover:ring-sky-500 disabled:opacity-50"
              onClick={onSaveAuth}
              disabled={!auth.trim()}
            >
              Gem
            </button>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-3 py-1.5 ring-1 ring-slate-700 hover:ring-rose-500"
              onClick={onClearAuth}
            >
              Ryd nøgle
            </button>
          </div>

          {unsaved && (
            <div className="mt-2 rounded-lg bg-amber-900/30 p-2 text-xs text-amber-200 ring-1 ring-amber-700">
              Den indtastede nøgle er ikke gemt lokalt endnu.
            </div>
          )}

          <p className="mt-2 text-xs text-slate-400">
            Nøglen bruges kun ved direkte TMDB-kald og gemmes kun i denne browser.
          </p>
        </div>

        <ul className="space-y-1">
          <li>
            TAXA-cache: {taxaCount ? <Pill>{taxaCount} personer</Pill> : <Pill>tom</Pill>}
          </li>
          <li>
            Cachetid: <Pill>{formatCacheTime(taxaMeta?.savedAt)}</Pill>
          </li>
          <li>
            Resultater: <Pill>{resultCount}</Pill>
          </li>
          <li>
            Overlap: <Pill>{overlapCount}</Pill>
          </li>
        </ul>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRefreshTaxa}
            className="rounded-lg bg-slate-900 px-3 py-1.5 ring-1 ring-slate-700 hover:ring-sky-500 disabled:opacity-50"
            disabled={taxaLoading || !connectionReady}
          >
            {taxaLoading ? "Henter TAXA…" : "Hent/Opdater TAXA-liste"}
          </button>
          <button
            type="button"
            className="rounded-lg bg-rose-900/40 px-3 py-1.5 ring-1 ring-rose-700 hover:ring-rose-500"
            onClick={onClearAll}
          >
            Ryd nøgle og TAXA-cache
          </button>
        </div>
      </div>
    </aside>
  );
}

function formatCacheTime(savedAt) {
  if (!savedAt) return "ukendt";
  try {
    return new Intl.DateTimeFormat("da-DK", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(savedAt));
  } catch {
    return "ukendt";
  }
}
