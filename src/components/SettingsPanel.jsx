import {
  CONNECTION_MODES,
  detectAuthType,
  maskAuth,
} from "../api/tmdbClient.js";
import { Pill } from "./ui.jsx";

export function SettingsPanel({
  open,
  onClose,
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
  language,
  onLanguageChange,
  includeAdult,
  onIncludeAdultChange,
  autoAlternateSearch,
  onAutoAlternateSearchChange,
  danishOnly,
  onDanishOnlyChange,
  originalTitleOnly,
  onOriginalTitleOnlyChange,
  taxaCount,
  taxaMeta,
  taxaLoading,
  onRefreshTaxa,
  onClearAll,
  activeSource,
  connectionReady,
}) {
  if (!open) return null;

  const authType = detectAuthType(auth);
  const unsaved = Boolean(auth.trim()) && auth.trim() !== savedAuth;
  const proxyMode = connectionMode === CONNECTION_MODES.AUTO || connectionMode === CONNECTION_MODES.PROXY;

  const sourceLabel = {
    proxy: "Via TAXA",
    direct: "Direkte TMDB",
    "direct-fallback": "Direkte fallback",
  }[activeSource];

  function chooseConnection(mode) {
    onConnectionModeChange(mode);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-slate-950/70 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="max-h-[calc(100vh-1.5rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-slate-900 p-5 shadow-2xl ring-1 ring-slate-700 md:mt-2 md:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 id="settings-title" className="text-xl font-semibold">Indstillinger</h2>
            <p className="mt-1 text-xs text-slate-400">Forbindelse, sprog og lokale data</p>
          </div>
          <button
            type="button"
            className="rounded-full px-3 py-2 text-sm text-slate-300 ring-1 ring-slate-700 hover:ring-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
            onClick={onClose}
          >
            Luk
          </button>
        </div>

        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Forbindelse</h3>
          <div className="grid gap-2">
            {proxyConfigured && (
              <button
                type="button"
                aria-pressed={connectionMode === CONNECTION_MODES.AUTO}
                onClick={() => chooseConnection(CONNECTION_MODES.AUTO)}
                className={`rounded-2xl p-3 text-left ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300 ${
                  connectionMode === CONNECTION_MODES.AUTO
                    ? "bg-yellow-400/10 ring-yellow-400/60"
                    : "bg-slate-800/60 ring-slate-700 hover:ring-slate-500"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">Via TAXA</span>
                  <Pill>Anbefalet</Pill>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Kald går via proxyen. Din egen nøgle kan bruges automatisk som fallback, hvis proxyen er utilgængelig.
                </p>
              </button>
            )}

            <button
              type="button"
              aria-pressed={connectionMode === CONNECTION_MODES.DIRECT}
              onClick={() => chooseConnection(CONNECTION_MODES.DIRECT)}
              className={`rounded-2xl p-3 text-left ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300 ${
                connectionMode === CONNECTION_MODES.DIRECT
                  ? "bg-yellow-400/10 ring-yellow-400/60"
                  : "bg-slate-800/60 ring-slate-700 hover:ring-slate-500"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">Direkte til TMDB</span>
                <Pill>Privat</Pill>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Brug din egen TMDB-nøgle og send kald direkte fra denne browser til TMDB.
              </p>
            </button>

            {proxyConfigured && (
              <button
                type="button"
                aria-pressed={connectionMode === CONNECTION_MODES.PROXY}
                onClick={() => chooseConnection(CONNECTION_MODES.PROXY)}
                className="mt-1 text-left text-xs text-slate-500 underline decoration-slate-700 underline-offset-2 hover:text-slate-300"
              >
                Brug kun via TAXA (fejlsøgning)
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
            <Pill>{connectionReady ? "Klar" : "Mangler konfiguration"}</Pill>
            {sourceLabel && <Pill title="Seneste datakilde">Senest: {sourceLabel}</Pill>}
          </div>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">TMDB-nøgle</h3>
          <p className="mb-3 text-xs leading-5 text-slate-400">
            Kun nødvendig for direkte TMDB-kald eller som fallback. Den gemmes kun i denne browser.
          </p>

          <div className="mb-2 break-all text-xs text-slate-400">
            {showAuth ? auth || "(ingen gemt)" : maskAuth(auth)}
          </div>

          <div className="flex gap-2">
            <input
              aria-label="TMDB API-nøgle eller Bearer-token"
              type={showAuth ? "text" : "password"}
              autoComplete="off"
              spellCheck="false"
              className="min-w-0 flex-1 rounded-xl bg-slate-950 px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-yellow-400/70"
              placeholder="v4 Bearer-token eller v3 api_key"
              value={auth}
              onChange={(event) => onAuthChange(event.target.value)}
            />
            <button
              type="button"
              className="rounded-xl px-3 py-2 text-xs ring-1 ring-slate-700 hover:ring-slate-500"
              onClick={() => onShowAuthChange(!showAuth)}
            >
              {showAuth ? "Skjul" : "Vis"}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-slate-800 px-3 py-2 text-xs ring-1 ring-slate-700 hover:ring-yellow-400/50 disabled:opacity-50"
              onClick={onSaveAuth}
              disabled={!auth.trim()}
            >
              Gem nøgle
            </button>
            <button
              type="button"
              className="rounded-xl bg-slate-800 px-3 py-2 text-xs ring-1 ring-slate-700 hover:ring-rose-500/70"
              onClick={onClearAuth}
            >
              Ryd nøgle
            </button>
            {authType !== "none" && <Pill>{authType === "v4-bearer" ? "v4 Bearer" : "v3 API key"}</Pill>}
          </div>

          {unsaved && (
            <div className="mt-2 rounded-xl bg-amber-900/30 p-2 text-xs text-amber-200 ring-1 ring-amber-700">
              Den indtastede nøgle er ikke gemt lokalt endnu.
            </div>
          )}
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Søgning</h3>

          <label htmlFor="settings-language" className="mb-1 block text-xs text-slate-400">Sprog</label>
          <select
            id="settings-language"
            className="mb-4 w-full rounded-xl bg-slate-950 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-yellow-400/70"
            value={language}
            onChange={(event) => onLanguageChange(event.target.value)}
          >
            <option value="da-DK">Dansk</option>
            <option value="en-US">Engelsk</option>
            <option value="sv-SE">Svensk</option>
            <option value="nb-NO">Norsk</option>
            <option value="de-DE">Tysk</option>
          </select>

          <div className="grid gap-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-800/50 p-3 ring-1 ring-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-yellow-400"
                checked={includeAdult}
                onChange={(event) => onIncludeAdultChange(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium">Medtag voksenindhold</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">
                  Inkluder også TMDB-resultater markeret som voksenindhold.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-800/50 p-3 ring-1 ring-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-yellow-400"
                checked={autoAlternateSearch}
                onChange={(event) => onAutoAlternateSearchChange(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium">Prøv automatisk den anden type</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">
                  Hvis der ikke findes resultater som film eller serie, prøves den anden type én gang.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-800/50 p-3 ring-1 ring-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-yellow-400"
                checked={danishOnly}
                onChange={(event) => onDanishOnlyChange(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium">Vis kun dansksprogede titler</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">
                  Filtrerer efter TMDB's angivelse af originalt sprog (da).
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-800/50 p-3 ring-1 ring-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-yellow-400"
                checked={originalTitleOnly}
                onChange={(event) => onOriginalTitleOnlyChange(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium">Søg kun på originaltitel</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">
                  Skjuler resultater, hvor søgeteksten ikke findes i værkets originale titel.
                </span>
              </span>
            </label>
          </div>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Data</h3>
          <div className="grid gap-2 rounded-2xl bg-slate-800/50 p-3 text-xs text-slate-400 ring-1 ring-slate-700">
            <div className="flex justify-between gap-3"><span>TAXA-cache</span><span>{taxaCount ? `${taxaCount} personer` : "tom"}</span></div>
            <div className="flex justify-between gap-3"><span>Senest gemt</span><span>{formatCacheTime(taxaMeta?.savedAt)}</span></div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRefreshTaxa}
              className="rounded-xl bg-slate-800 px-3 py-2 text-xs ring-1 ring-slate-700 hover:ring-yellow-400/50 disabled:opacity-50"
              disabled={taxaLoading || !connectionReady}
            >
              {taxaLoading ? "Opdaterer…" : "Opdater TAXA-data"}
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-xl bg-rose-900/30 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-800 hover:ring-rose-500"
            >
              Nulstil lokale data
            </button>
          </div>
        </section>

        <p className="text-xs leading-5 text-slate-500">
          Proxyen kan se din netværksforbindelse til serveren. Direkte tilstand sender TMDB-kald fra browseren. Klient-id bruges kun til begrænset rate limiting på proxyen.
        </p>

        <p className="mt-4 text-xs text-slate-500">Version 1.3.0</p>
      </aside>
    </div>
  );
}

function formatCacheTime(savedAt) {
  if (!savedAt) return "ukendt";
  try {
    return new Intl.DateTimeFormat("da-DK", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(savedAt));
  } catch {
    return "ukendt";
  }
}
