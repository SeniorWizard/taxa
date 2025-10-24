/* global React, ReactDOM */
// TMDB TAXA-overlap PWA - Browser JSX version (no bundler)
const LS_KEYS = {
  taxa: "tmdb_taxa_aggregate_credits_v1",
  taxaMeta: "tmdb_taxa_aggregate_meta_v1",
  auth: "tmdb_auth_v1",
  lang: "tmdb_lang_v1",
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const TAXA_TV_ID = 51261;

function isBearer(input) {
  return /^(?:BEARER\s+)?[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}$/.test((input||"").trim())
    || (input||"").trim().toLowerCase().startsWith("bearer ");
}

function buildHeaders(auth) {
  const headers = { accept: "application/json" };
  if (!auth) return headers;
  if (isBearer(auth)) {
    headers["Authorization"] = auth.toLowerCase().startsWith("bearer ")
      ? auth.trim()
      : `Bearer ${auth.trim()}`;
  }
  return headers;
}

function maskAuth(auth) {
  if (!auth) return "(ingen gemt)";
  const s = auth.trim();
  if (isBearer(s)) {
    const core = s.toLowerCase().startsWith("bearer ") ? s.slice(7) : s;
    return `Bearer ${core.slice(0, 4)}...${core.slice(-4)}`;
  }
  return `api_key ${s.slice(0, 4)}...${s.slice(-4)}`;
}

function detectAuthType(auth) {
  if (!auth || !auth.trim()) return "none";
  return isBearer(auth) ? "v4-bearer" : "v3-apikey";
}

function tmdbUrl(path, params = {}, auth) {
  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  if (!isBearer(auth) && auth) {
    url.searchParams.set("api_key", auth.trim());
  }
  return url.toString();
}

async function jsonGet(path, params, auth) {
  const url = tmdbUrl(path, params, auth);
  const res = await fetch(url, { headers: buildHeaders(auth) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TMDB-fejl ${res.status}: ${text}`);
  }
  return res.json();
}

function buildTaxaMap(taxaAggregate) {
  const map = new Map();
  const cast = Array.isArray(taxaAggregate?.cast) ? taxaAggregate.cast : [];
  for (const person of cast) {
    const personId = person?.id;
    if (!personId) continue;
    const roles = Array.isArray(person.roles) ? person.roles : [];
    const taxaRoles = roles.map((r) => ({
      character: r?.character || "(ukendt)",
      episodes: r?.episode_count ?? r?.total_episode_count ?? null,
    }));
    const episodesTotal = taxaRoles.reduce((acc, r) => acc + (Number(r.episodes) || 0), 0);
    map.set(personId, {
      id: personId,
      name: person?.name || "(ukendt)",
      taxaRoles,
      episodesTotal,
      profile_path: person?.profile_path || null,
    });
  }
  return map;
}

function rolesFromCreditItem(item, mediaType) {
  if (mediaType === "movie") {
    const ch = item?.character || item?.roles?.[0]?.character || "(ukendt)";
    return [{ character: ch, episodes: null }];
  }
  const roles = Array.isArray(item?.roles) ? item.roles : [];
  if (!roles.length && item?.character) {
    return [{ character: item.character, episodes: item?.episode_count ?? null }];
  }
  return roles.map((r) => ({ character: r?.character || "(ukendt)", episodes: r?.episode_count ?? r?.total_episode_count ?? null }));
}

function computeHereStats(item, mediaType) {
  if (mediaType === "tv") {
    const roles = Array.isArray(item?.roles) ? item.roles : [];
    const hereEpisodes = roles.reduce((acc, r) => acc + (Number(r?.episode_count ?? r?.total_episode_count ?? 0) || 0), 0);
    return { hereEpisodes, hereOrder: null };
  }
  const hereOrder = Number.isFinite(item?.order) ? item.order : 999999;
  return { hereEpisodes: 0, hereOrder };
}

function compareMatches(type, sortMode = "taxa") {
  return (a, b) => {
    const byName = a.name.localeCompare(b.name, "da");

    if (sortMode === "name") {
      return byName;
    }

    if (type === "tv") {
      if (sortMode === "here") {
        const byHereFirst = (b.hereEpisodes || 0) - (a.hereEpisodes || 0);
        if (byHereFirst !== 0) return byHereFirst;
        const byTaxaThen = (b.taxaEpisodes || 0) - (a.taxaEpisodes || 0);
        if (byTaxaThen !== 0) return byTaxaThen;
        return byName;
      }
      const byTaxa = (b.taxaEpisodes || 0) - (a.taxaEpisodes || 0);
      if (byTaxa !== 0) return byTaxa;
      const byHere = (b.hereEpisodes || 0) - (a.hereEpisodes || 0);
      if (byHere !== 0) return byHere;
      return byName;
    } else {
      if (sortMode === "here") {
        const byOrderFirst = (a.hereOrder || 999999) - (b.hereOrder || 999999);
        if (byOrderFirst !== 0) return byOrderFirst;
        const byTaxaThen = (b.taxaEpisodes || 0) - (a.taxaEpisodes || 0);
        if (byTaxaThen !== 0) return byTaxaThen;
        return byName;
      }
      const byTaxa = (b.taxaEpisodes || 0) - (a.taxaEpisodes || 0);
      if (byTaxa !== 0) return byTaxa;
      const byOrder = (a.hereOrder || 999999) - (b.hereOrder || 999999);
      if (byOrder !== 0) return byOrder;
      return byName;
    }
  };
}

function ensureManifestLink() {
  // static manifest is linked in index.html
}

function registerSW() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

// Simple UI helpers as functions returning JSX
function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm text-slate-300 mb-1">
      {children}
    </label>
  );
}

function Field({ children }) {
  return <div className="mb-4">{children}</div>;
}

function Pill({ children }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700/60">
      {children}
    </span>
  );
}

function App() {
  const [auth, setAuth] = React.useState("");
  const [showAuth, setShowAuth] = React.useState(false);
  const [showSavePrompt, setShowSavePrompt] = React.useState(false);
  const authType = React.useMemo(() => detectAuthType(auth), [auth]);
  const [lang, setLang] = React.useState("da-DK");
  const [mediaType, setMediaType] = React.useState("tv");
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState([]);

  const [taxaAggregate, setTaxaAggregate] = React.useState(null);
  const [taxaLoading, setTaxaLoading] = React.useState(false);
  const taxaMap = React.useMemo(() => buildTaxaMap(taxaAggregate), [taxaAggregate]);

  const [selected, setSelected] = React.useState(null);
  const [checking, setChecking] = React.useState(false);
  const [overlaps, setOverlaps] = React.useState([]);
  const [sortMode, setSortMode] = React.useState("taxa");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    ensureManifestLink();
    registerSW();
    const savedAuth = localStorage.getItem(LS_KEYS.auth);
    const savedLang = localStorage.getItem(LS_KEYS.lang);
    if (savedAuth) setAuth(savedAuth);
    if (savedLang) setLang(savedLang);
    try {
      const savedTaxa = localStorage.getItem(LS_KEYS.taxa);
      if (savedTaxa) setTaxaAggregate(JSON.parse(savedTaxa));
    } catch {}
  }, []);

  React.useEffect(() => {
    const saved = localStorage.getItem(LS_KEYS.auth) || "";
    if (auth && auth !== saved) setShowSavePrompt(true); else setShowSavePrompt(false);
  }, [auth]);
  React.useEffect(() => {
    if (lang) localStorage.setItem(LS_KEYS.lang, lang);
  }, [lang]);

  async function fetchTaxa(force = false) {
    if (!auth) {
      setError("Angiv først din TMDB API-nøgle eller Bearer token.");
      return;
    }
    setError("");
    try {
      setTaxaLoading(true);
      const metaRaw = localStorage.getItem(LS_KEYS.taxaMeta);
      const meta = metaRaw ? JSON.parse(metaRaw) : null;
      const maxAgeMs = 1000 * 60 * 60 * 24 * 30;
      const isFresh = !force && meta && Date.now() - meta.savedAt < maxAgeMs;
      if (isFresh && taxaAggregate) return;

      const data = await jsonGet(`/tv/${TAXA_TV_ID}/aggregate_credits`, { language: lang }, auth);
      setTaxaAggregate(data);
      localStorage.setItem(LS_KEYS.taxa, JSON.stringify(data));
      localStorage.setItem(LS_KEYS.taxaMeta, JSON.stringify({ savedAt: Date.now(), language: lang }));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setTaxaLoading(false);
    }
  }

  React.useEffect(() => {
    if (!taxaAggregate && auth) {
      fetchTaxa().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  async function doSearch() {
    if (!auth) {
      setError("Angiv først din TMDB API-nøgle eller Bearer token.");
      return;
    }
    setError("");
    setSearching(true);
    setResults([]);
    setSelected(null);
    setOverlaps([]);
    try {
      const path = mediaType === "tv" ? "/search/tv" : "/search/movie";
      const data = await jsonGet(path, { query, include_adult: false, language: lang }, auth);
      const arr = Array.isArray(data?.results) ? data.results : [];
      setResults(arr);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSearching(false);
    }
  }

  async function checkSelected(item) {
    if (!item) return;
    if (!taxaMap || taxaMap.size === 0) {
      await fetchTaxa(true);
    }
    setSelected(item);
    setChecking(true);
    setOverlaps([]);
    setError("");
    try {
      const id = item.id;
      const type = mediaType;
      const path = type === "tv" ? `/tv/${id}/aggregate_credits` : `/movie/${id}/credits`;
      const credits = await jsonGet(path, { language: lang }, auth);
      const cast = Array.isArray(credits?.cast) ? credits.cast : [];

      const matches = [];
      for (const person of cast) {
        const taxaPerson = taxaMap.get(person.id);
        if (!taxaPerson) continue;
        const rolesHere = rolesFromCreditItem(person, type);
        const { hereEpisodes, hereOrder } = computeHereStats(person, type);
        matches.push({
          personId: person.id,
          name: person.name,
          hereRoles: rolesHere,
          hereEpisodes,
          hereOrder,
          taxaRoles: taxaPerson.taxaRoles,
          taxaEpisodes: taxaPerson.episodesTotal,
          profile_path: person.profile_path || taxaPerson.profile_path || null,
        });
      }
      matches.sort(compareMatches(type, sortMode));
      setOverlaps(matches);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setChecking(false);
    }
  }

  React.useEffect(() => {
    if (!selected || overlaps.length === 0) return;
    setOverlaps((curr) => [...curr].sort(compareMatches(mediaType, sortMode)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode]);

  function yearFrom(item) {
    const dateStr = mediaType === "tv" ? item?.first_air_date : item?.release_date;
    return dateStr ? String(dateStr).slice(0, 4) : "";
  }

  function tmdbImg(path, size = "w185") {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  function saveAuth() {
    if (!auth || !auth.trim()) return;
    localStorage.setItem(LS_KEYS.auth, auth.trim());
    setShowSavePrompt(false);
  }

  function logoutAndClear() {
    localStorage.removeItem(LS_KEYS.auth);
    localStorage.removeItem(LS_KEYS.taxa);
    localStorage.removeItem(LS_KEYS.taxaMeta);
    setAuth("");
    setTaxaAggregate(null);
    setResults([]);
    setSelected(null);
    setOverlaps([]);
    setError("");
  }

  // self-tests
  React.useEffect(() => {
    window.runTaxaTests = () => {
      const tvMatches = [
        { name: "A", taxaEpisodes: 5, hereEpisodes: 10 },
        { name: "B", taxaEpisodes: 5, hereEpisodes: 2 },
        { name: "C", taxaEpisodes: 7, hereEpisodes: 1 },
      ];
      const filmMatches = [
        { name: "X", taxaEpisodes: 3, hereOrder: 10 },
        { name: "Y", taxaEpisodes: 3, hereOrder: 2 },
        { name: "Z", taxaEpisodes: 5, hereOrder: 50 },
      ];
      const tvSorted = [...tvMatches].sort(compareMatches("tv", "taxa"));
      const filmSorted = [...filmMatches].sort(compareMatches("movie", "taxa"));
      const tvSortedHere = [...tvMatches].sort(compareMatches("tv", "here"));
      const filmSortedHere = [...filmMatches].sort(compareMatches("movie", "here"));
      const tvSortedName = [...tvMatches].sort(compareMatches("tv", "name"));

      const tvOk = tvSorted.map(x => x.name).join(",") === "C,A,B";
      const filmOk = filmSorted.map(x => x.name).join(",") === "Z,Y,X";
      const tvHereOk = tvSortedHere.map(x => x.name).join(",") === "A,B,C";
      const filmHereOk = filmSortedHere.map(x => x.name).join(",") === "Y,X,Z";
      const tvNameOk = tvSortedName.map(x => x.name).join(",") === "A,B,C";

      console.assert(tvOk, "TV-sort (taxa) C,A,B");
      console.assert(filmOk, "Film-sort (taxa) Z,Y,X");
      console.assert(tvHereOk, "TV-sort (here) A,B,C");
      console.assert(filmHereOk, "Film-sort (here) Y,X,Z");
      console.assert(tvNameOk, "TV-sort (name) A,B,C");

      const dNone = detectAuthType("") === "none";
      const dV4 = detectAuthType("Bearer abc.def.ghi") === "v4-bearer";
      const dV3 = detectAuthType("abcd1234efgh5678") === "v3-apikey";
      console.assert(dNone && dV4 && dV3, "detectAuthType cases");
      return { tvOk, filmOk, tvHereOk, filmHereOk, tvNameOk, dNone, dV4, dV3 };
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">TAXA-overlap for film & serier</h1>
          <div className="text-xs opacity-75">Bruger TMDB API</div>
        </header>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 bg-slate-800/60 rounded-2xl p-4 shadow">
            <div className="grid md:grid-cols-3 gap-3">
              <Field>
                <Label>Type</Label>
                <div className="flex gap-2">
                  {["tv", "movie"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setMediaType(t)}
                      className={`px-3 py-2 rounded-2xl ring-1 ${mediaType===t?"ring-sky-500 bg-sky-500/10":"ring-slate-700 bg-slate-900"}`}
                    >{t === "tv" ? "TV-serie" : "Film"}</button>
                  ))}
                </div>
              </Field>

              <Field>
                <Label>Sprog for titler</Label>
                <select
                  className="w-full bg-slate-900 rounded-xl px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                >
                  <option value="da-DK">Dansk (da-DK)</option>
                  <option value="en-US">Engelsk (en-US)</option>
                  <option value="sv-SE">Svensk (sv-SE)</option>
                  <option value="nb-NO">Norsk (nb-NO)</option>
                  <option value="de-DE">Tysk (de-DE)</option>
                </select>
              </Field>
            </div>

            <Field>
              <Label>Søg titel</Label>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-slate-900 rounded-xl px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
                  placeholder={mediaType === "tv" ? "Søg efter TV-serie…" : "Søg efter film…"}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
                />
                <button
                  onClick={doSearch}
                  className="px-4 py-2 rounded-2xl ring-1 ring-slate-700 bg-slate-900 hover:ring-sky-500 disabled:opacity-50"
                  disabled={searching || !query}
                >{searching ? "Søger…" : "Søg"}</button>
              </div>
            </Field>
          </div>

          <aside className="bg-slate-800/60 rounded-2xl p-4 shadow">
            <h2 className="text-lg font-medium mb-2">Status</h2>
            <div className="space-y-3 text-sm">
              <div className="bg-slate-900/40 rounded-xl p-3 ring-1 ring-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">API-nøgle / token</div>
                  <button
                    className="text-xs px-2 py-1 rounded-lg ring-1 ring-slate-700 hover:ring-sky-500"
                    onClick={() => setShowAuth(v => !v)}
                  >{showAuth ? "Skjul" : "Vis"}</button>
                </div>
                <div className="mb-2 text-slate-300 break-all">
                  {showAuth ? (auth || "(ingen gemt)") : maskAuth(auth)}
                </div>
                <div className="mb-2 text-xs text-slate-400 flex items-center gap-2">
                  <span>Type:</span>
                  {authType === "v4-bearer" && <Pill>v4 Bearer</Pill>}
                  {authType === "v3-apikey" && <Pill>v3 API key</Pill>}
                  {authType === "none" && <Pill>(ukendt)</Pill>}
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-slate-900 rounded-xl px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
                    placeholder="v4 Bearer token eller v3 api_key"
                    value={auth}
                    onChange={(e) => setAuth(e.target.value)}
                  />
                </div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <button
                    className="px-3 py-1.5 rounded-lg ring-1 ring-slate-700 bg-slate-900 hover:ring-sky-500"
                    onClick={() => { if (auth && auth.trim()) { localStorage.setItem(LS_KEYS.auth, auth.trim()); setShowSavePrompt(false); } }}
                  >Gem</button>
                  <button
                    className="px-3 py-1.5 rounded-lg ring-1 ring-slate-700 bg-slate-900 hover:ring-rose-500"
                    onClick={() => { localStorage.removeItem(LS_KEYS.auth); setAuth(""); }}
                  >Ryd</button>
                  <button
                    className="px-3 py-1.5 rounded-lg ring-1 ring-rose-700 bg-rose-900/40 hover:ring-rose-500"
                    onClick={() => {
                      localStorage.removeItem(LS_KEYS.auth);
                      localStorage.removeItem(LS_KEYS.taxa);
                      localStorage.removeItem(LS_KEYS.taxaMeta);
                      setAuth("");
                      setTaxaAggregate(null);
                      setResults([]);
                      setSelected(null);
                      setOverlaps([]);
                      setError("");
                    }}
                  >Log ud + ryd TAXA</button>
                  <button
                    onClick={() => fetchTaxa(true)}
                    className="ml-auto px-3 py-1.5 rounded-lg ring-1 ring-slate-700 bg-slate-900 hover:ring-sky-500 disabled:opacity-50"
                    disabled={taxaLoading || !auth}
                  >{taxaLoading ? "Henter TAXA…" : "Hent/Opdater TAXA-liste"}</button>
                </div>
                {showSavePrompt && (
                  <div className="mt-2 p-2 rounded-lg ring-1 ring-amber-700 bg-amber-900/30 text-amber-200 text-xs flex items-center gap-2">
                    <span>Ny token er ikke gemt endnu.</span>
                    <button className="px-2 py-1 rounded ring-1 ring-amber-700 bg-amber-900/40 hover:ring-amber-500" onClick={() => { if (auth && auth.trim()) { localStorage.setItem(LS_KEYS.auth, auth.trim()); setShowSavePrompt(false); } }}>Gem nu</button>
                    <button className="px-2 py-1 rounded ring-1 ring-slate-700 bg-slate-900/40 hover:ring-slate-500" onClick={() => setShowSavePrompt(false)}>Ignorer</button>
                  </div>
                )}
                <div className="mt-1 text-xs text-slate-400">Token gemmes i localStorage (kun på denne enhed/browser).</div>
              </div>

              <ul className="text-sm space-y-1">
                <li>Taxa-cache: {taxaMap.size ? <Pill>{taxaMap.size} personer</Pill> : <Pill>tom</Pill>}</li>
                <li>Valgt type: <Pill>{mediaType === "tv" ? "TV-serie" : "Film"}</Pill></li>
                <li>Resultater: <Pill>{results.length}</Pill></li>
                <li>Overlap: <Pill>{overlaps.length}</Pill></li>
              </ul>
              <div className="mt-1 text-xs text-slate-400">
                Bemærk: Film bruger /credits, serier bruger /aggregate_credits.
              </div>
            </div>
          </aside>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 text-red-200 rounded-xl ring-1 ring-red-800">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Vælg titel</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {results.map((item) => (
                <button
                  key={`${mediaType}-${item.id}`}
                  onClick={() => checkSelected(item)}
                  className="text-left bg-slate-800/60 hover:bg-slate-800 rounded-2xl p-3 ring-1 ring-slate-700"
                >
                  <div className="flex gap-3 items-center">
                    <div className="w-12 h-16 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
                      {item.poster_path && (
                        <img src={tmdbImg(item.poster_path, "w92")} alt="poster" className="w-full h-full object-cover"/>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {mediaType === "tv" ? (item.name || item.original_name) : (item.title || item.original_title)}
                      </div>
                      <div className="text-xs text-slate-400">{yearFrom(item)}</div>
                      {mediaType === "tv" && item?.number_of_episodes ? (
                        <div className="text-xs text-slate-400">{item.number_of_episodes} episoder</div>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {selected && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Overlap med TAXA</h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400 hidden sm:inline">Sortér efter</span>
                <select
                  className="bg-slate-900 rounded-xl px-2 py-1 ring-1 ring-slate-700 focus:ring-sky-500"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                >
                  <option value="taxa">TAXA-episoder (default)</option>
                  {mediaType === "tv" ? (
                    <option value="here">Episoder i valgt serie</option>
                  ) : (
                    <option value="here">Billing-orden (film)</option>
                  )}
                  <option value="name">Alfabetisk (A–Å)</option>
                </select>
              </div>
            </div>

            {checking && <div className="text-slate-300">Tjekker…</div>}

            {!checking && overlaps.length === 0 && (
              <div className="p-4 bg-emerald-900/30 text-emerald-200 rounded-xl ring-1 ring-emerald-800">
                tillykke - du har fundet en taxa-fri serie
              </div>
            )}

            {!checking && overlaps.length > 0 && (
              <div className="grid gap-3">
                {overlaps.map((m) => (
                  <div key={m.personId} className="bg-slate-800/60 rounded-2xl p-3 ring-1 ring-slate-700">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-700 overflow-hidden flex-shrink-0">
                        {m.profile_path && (
                          <img src={tmdbImg(m.profile_path, "w185")} alt={m.name} className="w-full h-full object-cover"/>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium mb-1">{m.name}</div>
                        <div className="text-sm">
                          <div className="mb-1">
                            <span className="text-slate-400">Rolle i valgt titel: </span>
                            {m.hereRoles.map((r, idx) => (
                              <Pill key={idx}>{r.character}{r.episodes ? ` • ${r.episodes} eps` : ""}</Pill>
                            ))}
                          </div>
                          <div>
                            <span className="text-slate-400">Rolle(r) i TAXA: </span>
                            {m.taxaRoles.map((r, idx) => (
                              <Pill key={idx}>{r.character}{r.episodes ? ` • ${r.episodes} eps` : ""}</Pill>
                            ))}
                            <span className="ml-2 text-xs text-slate-400">(i alt {m.taxaEpisodes} episoder)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <footer className="mt-10 text-xs text-slate-500">
          Kilde: themoviedb.org. Denne app lagrer kun dine data lokalt i browseren.
        </footer>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
