import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createTmdbClient } from "./api/tmdbClient.js";
import { OverlapResults } from "./components/OverlapResults.jsx";
import { SearchPanel } from "./components/SearchPanel.jsx";
import { SearchResults } from "./components/SearchResults.jsx";
import { SettingsPanel } from "./components/SettingsPanel.jsx";
import {
  APP_VERSION,
  PROXY_BASE_URL,
  TAXA_CACHE_MAX_AGE_MS,
} from "./config.js";
import {
  buildReferenceMap,
  compareMatches,
  findOverlaps,
} from "./domain/overlap.js";
import {
  clearAppData,
  clearAuth,
  clearTaxaCache,
  loadAuth,
  loadConnectionMode,
  loadLanguage,
  loadOrCreateProxyClientId,
  readTaxaCache,
  saveAuth,
  saveConnectionMode,
  saveLanguage,
  writeTaxaCache,
} from "./storage/localStorage.js";

const proxyConfigured = Boolean(PROXY_BASE_URL);

export default function App() {
  const [auth, setAuth] = useState(() => loadAuth());
  const [savedAuth, setSavedAuth] = useState(() => loadAuth());
  const [showAuth, setShowAuth] = useState(false);
  const [connectionMode, setConnectionMode] = useState(() =>
    loadConnectionMode(proxyConfigured),
  );
  const [activeSource, setActiveSource] = useState("");
  const [proxyClientId] = useState(() => loadOrCreateProxyClientId());

  const [language, setLanguage] = useState(() => loadLanguage());
  const [mediaType, setMediaType] = useState("tv");
  const [query, setQuery] = useState("");

  const [searching, setSearching] = useState(false);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [results, setResults] = useState([]);

  const [taxaAggregate, setTaxaAggregate] = useState(null);
  const [taxaMeta, setTaxaMeta] = useState(null);
  const [taxaLoading, setTaxaLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [overlapStatus, setOverlapStatus] = useState("idle");
  const [overlaps, setOverlaps] = useState([]);
  const [sortMode, setSortMode] = useState("reference");
  const [error, setError] = useState("");

  const searchAbortRef = useRef(null);
  const creditsAbortRef = useRef(null);

  const client = useMemo(
    () =>
      createTmdbClient({
        mode: connectionMode,
        auth,
        proxyBaseUrl: PROXY_BASE_URL,
        proxyClientId,
        onSource: setActiveSource,
      }),
    [auth, connectionMode, proxyClientId],
  );

  const connectionReady = client.isConfigured();
  const taxaMap = useMemo(
    () => buildReferenceMap(taxaAggregate),
    [taxaAggregate],
  );

  useEffect(() => {
    const cached = readTaxaCache(language, TAXA_CACHE_MAX_AGE_MS);
    setTaxaAggregate(cached?.data || null);
    setTaxaMeta(cached?.meta || null);
  }, [language]);

  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
      creditsAbortRef.current?.abort();
    };
  }, []);

  const loadTaxa = useCallback(
    async ({ force = false, signal } = {}) => {
      if (!client.isConfigured()) {
        throw new Error("Konfigurér en proxy eller din egen TMDB-nøgle først.");
      }

      if (!force) {
        const cached = readTaxaCache(language, TAXA_CACHE_MAX_AGE_MS);
        if (cached?.fresh) {
          setTaxaAggregate(cached.data);
          setTaxaMeta(cached.meta);
          return cached.data;
        }
      }

      setTaxaLoading(true);
      try {
        const data = await client.getTaxaCredits({ language, signal });
        const meta = writeTaxaCache(data, language);
        setTaxaAggregate(data);
        setTaxaMeta(meta);
        return data;
      } finally {
        setTaxaLoading(false);
      }
    },
    [client, language],
  );

  useEffect(() => {
    // Hent kun automatisk, når der findes en gemt direkte nøgle eller en proxy.
    // Derved starter et API-kald ikke ved hvert tastetryk i nøglefeltet.
    const canBackgroundLoad = proxyConfigured || Boolean(savedAuth);
    const cached = readTaxaCache(language, TAXA_CACHE_MAX_AGE_MS);
    if (!cached && canBackgroundLoad && client.isConfigured()) {
      loadTaxa().catch((loadError) => {
        console.warn("TAXA-data kunne ikke indlæses automatisk:", loadError);
      });
    }
  }, [client, language, loadTaxa, savedAuth]);

  function resetResultState() {
    searchAbortRef.current?.abort();
    creditsAbortRef.current?.abort();
    setResults([]);
    setSearchCompleted(false);
    setSelected(null);
    setOverlaps([]);
    setOverlapStatus("idle");
    setError("");
  }

  function changeMediaType(nextType) {
    setMediaType(nextType);
    resetResultState();
  }

  function changeLanguage(nextLanguage) {
    saveLanguage(nextLanguage);
    setLanguage(nextLanguage);
    resetResultState();
  }

  function changeConnectionMode(nextMode) {
    saveConnectionMode(nextMode);
    setConnectionMode(nextMode);
    setActiveSource("");
    resetResultState();
  }

  function persistAuth() {
    if (!auth.trim()) return;
    saveAuth(auth);
    setAuth(auth.trim());
    setSavedAuth(auth.trim());
  }

  function removeAuth() {
    clearAuth();
    setAuth("");
    setSavedAuth("");
    setActiveSource("");
  }

  function removeAllData() {
    clearAppData();
    setAuth("");
    setSavedAuth("");
    setTaxaAggregate(null);
    setTaxaMeta(null);
    setActiveSource("");
    resetResultState();
  }

  async function refreshTaxa() {
    setError("");
    try {
      await loadTaxa({ force: true });
    } catch (refreshError) {
      setError(refreshError.message || String(refreshError));
    }
  }

  async function doSearch() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !client.isConfigured()) return;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearching(true);
    setSearchCompleted(false);
    setResults([]);
    setSelected(null);
    setOverlaps([]);
    setOverlapStatus("idle");
    setError("");

    try {
      const data = await client.searchTitles({
        mediaType,
        query: trimmedQuery,
        includeAdult: false,
        language,
        page: 1,
        signal: controller.signal,
      });
      setResults(Array.isArray(data?.results) ? data.results : []);
      setSearchCompleted(true);
    } catch (searchError) {
      if (searchError?.name === "AbortError") return;
      setError(searchError.message || String(searchError));
    } finally {
      if (searchAbortRef.current === controller) {
        setSearching(false);
      }
    }
  }

  async function checkSelected(item) {
    if (!item || !client.isConfigured()) return;

    creditsAbortRef.current?.abort();
    const controller = new AbortController();
    creditsAbortRef.current = controller;

    setSelected(item);
    setOverlapStatus("loading");
    setOverlaps([]);
    setError("");

    try {
      // Kritisk rettelse fra version 1.0: brug de data, som netop er hentet,
      // i stedet for en taxaMap fra en tidligere React-rendering.
      let referenceMap = taxaMap;
      if (referenceMap.size === 0) {
        const data = await loadTaxa({ force: true, signal: controller.signal });
        referenceMap = buildReferenceMap(data);
      }

      const credits = await client.getTitleCredits({
        mediaType,
        id: item.id,
        language,
        signal: controller.signal,
      });

      const matches = findOverlaps(
        credits?.cast,
        referenceMap,
        mediaType,
        sortMode,
      );
      setOverlaps(matches);
      setOverlapStatus("success");
    } catch (creditsError) {
      if (creditsError?.name === "AbortError") return;
      // En fejl må ikke fortolkes som et gyldigt resultat uden overlap.
      setOverlapStatus("error");
      setError(creditsError.message || String(creditsError));
    }
  }

  useEffect(() => {
    if (overlapStatus !== "success" || overlaps.length === 0) return;
    setOverlaps((current) =>
      [...current].sort(compareMatches(mediaType, sortMode)),
    );
  }, [mediaType, overlapStatus, sortMode]);

  return (
    <div className="min-h-screen bg-slate-900 p-4 text-slate-100 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              TAXA-overlap for film &amp; serier
            </h1>
            <div className="text-xs text-slate-400">Version {APP_VERSION}</div>
          </div>
          <div className="text-right text-xs opacity-75">Bruger TMDB API</div>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <SearchPanel
            mediaType={mediaType}
            onMediaTypeChange={changeMediaType}
            language={language}
            onLanguageChange={changeLanguage}
            query={query}
            onQueryChange={setQuery}
            onSearch={doSearch}
            searching={searching}
            connectionReady={connectionReady}
          />

          <SettingsPanel
            auth={auth}
            savedAuth={savedAuth}
            showAuth={showAuth}
            onShowAuthChange={setShowAuth}
            onAuthChange={setAuth}
            onSaveAuth={persistAuth}
            onClearAuth={removeAuth}
            connectionMode={connectionMode}
            onConnectionModeChange={changeConnectionMode}
            proxyConfigured={proxyConfigured}
            taxaCount={taxaMap.size}
            taxaMeta={taxaMeta}
            taxaLoading={taxaLoading}
            onRefreshTaxa={refreshTaxa}
            onClearAll={removeAllData}
            resultCount={results.length}
            overlapCount={overlaps.length}
            activeSource={activeSource}
            connectionReady={connectionReady}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-red-900/30 p-3 text-red-200 ring-1 ring-red-800"
          >
            {error}
          </div>
        )}

        <SearchResults
          results={results}
          mediaType={mediaType}
          searching={searching}
          searchCompleted={searchCompleted}
          onSelect={checkSelected}
        />

        <OverlapResults
          selected={selected}
          mediaType={mediaType}
          status={overlapStatus}
          overlaps={overlaps}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
        />

        <footer className="mt-10 space-y-1 text-xs text-slate-500">
          <p>
            Kilde: The Movie Database (TMDB). Appen lagrer kun indstillinger og
            cache lokalt i browseren.
          </p>
          <p>
            This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </p>
        </footer>
      </div>
    </div>
  );
}
