import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createTmdbClient } from "./api/tmdbClient.js";
import { AboutPage } from "./components/AboutPage.jsx";
import { OverlapResults } from "./components/OverlapResults.jsx";
import { SearchPanel } from "./components/SearchPanel.jsx";
import { SearchResults } from "./components/SearchResults.jsx";
import { SettingsPanel } from "./components/SettingsPanel.jsx";
import { IconButton } from "./components/ui.jsx";
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
  loadAuth,
  loadConnectionMode,
  loadIncludeAdult,
  loadAutoAlternateSearch,
  loadDanishOnly,
  loadOriginalTitleOnly,
  loadLanguage,
  loadOrCreateProxyClientId,
  readTaxaCache,
  saveAuth,
  saveConnectionMode,
  saveIncludeAdult,
  saveAutoAlternateSearch,
  saveDanishOnly,
  saveOriginalTitleOnly,
  saveLanguage,
  writeTaxaCache,
} from "./storage/localStorage.js";
import {
  buildSmartSearchOptions,
  filterSearchResults,
  otherMediaType,
  buildSearchStatusItems,
} from "./domain/search.js";

const proxyConfigured = Boolean(PROXY_BASE_URL);

function currentPage() {
  return window.location.hash.replace(/^#/, "") || "home";
}

export default function App() {
  const [page, setPage] = useState(() => currentPage());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [auth, setAuth] = useState(() => loadAuth());
  const [savedAuth, setSavedAuth] = useState(() => loadAuth());
  const [showAuth, setShowAuth] = useState(false);
  const [connectionMode, setConnectionMode] = useState(() =>
    loadConnectionMode(proxyConfigured),
  );
  const [activeSource, setActiveSource] = useState("");
  const [proxyClientId] = useState(() => loadOrCreateProxyClientId());

  const [language, setLanguage] = useState(() => loadLanguage());
  const [includeAdult, setIncludeAdult] = useState(() => loadIncludeAdult());
  const [autoAlternateSearch, setAutoAlternateSearch] = useState(() => loadAutoAlternateSearch());
  const [danishOnly, setDanishOnly] = useState(() => loadDanishOnly());
  const [originalTitleOnly, setOriginalTitleOnly] = useState(() => loadOriginalTitleOnly());
  const [mediaType, setMediaType] = useState("tv");
  const [query, setQuery] = useState("");

  const [searching, setSearching] = useState(false);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [searchNotice, setSearchNotice] = useState("");
  const [results, setResults] = useState([]);
  const [smartSearchCriteria, setSmartSearchCriteria] = useState(null);

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
  const searchResultsRef = useRef(null);
  const overlapRef = useRef(null);

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
  const searchStatusItems = useMemo(
    () =>
      buildSearchStatusItems({
        connectionMode,
        language,
        includeAdult,
        danishOnly,
        originalTitleOnly,
        autoAlternateSearch,
      }),
    [
      connectionMode,
      language,
      includeAdult,
      danishOnly,
      originalTitleOnly,
      autoAlternateSearch,
    ],
  );
  const taxaMap = useMemo(
    () => buildReferenceMap(taxaAggregate),
    [taxaAggregate],
  );

  useEffect(() => {
    function handleHashChange() {
      setPage(currentPage());
      setSettingsOpen(false);
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

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
    const canBackgroundLoad = proxyConfigured || Boolean(savedAuth);
    const cached = readTaxaCache(language, TAXA_CACHE_MAX_AGE_MS);
    if (!cached && canBackgroundLoad && client.isConfigured()) {
      loadTaxa().catch((loadError) => {
        console.warn("TAXA-data kunne ikke indlæses automatisk:", loadError);
      });
    }
  }, [client, language, loadTaxa, savedAuth]);

  useEffect(() => {
    if (!searchCompleted || searching) return;
    requestAnimationFrame(() => {
      searchResultsRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      searchResultsRef.current?.focus({ preventScroll: true });
    });
  }, [searchCompleted, searching]);

  useEffect(() => {
    if (!selected) return;
    requestAnimationFrame(() => {
      overlapRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      overlapRef.current?.focus({ preventScroll: true });
    });
  }, [selected]);

  function resetResultState() {
    searchAbortRef.current?.abort();
    creditsAbortRef.current?.abort();
    setResults([]);
    setSearchCompleted(false);
    setSearchNotice("");
    setSmartSearchCriteria(null);
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

  function changeIncludeAdult(nextValue) {
    saveIncludeAdult(nextValue);
    setIncludeAdult(nextValue);
    resetResultState();
  }

  function changeAutoAlternateSearch(nextValue) {
    saveAutoAlternateSearch(nextValue);
    setAutoAlternateSearch(nextValue);
    resetResultState();
  }

  function changeDanishOnly(nextValue) {
    saveDanishOnly(nextValue);
    setDanishOnly(nextValue);
    resetResultState();
  }

  function changeOriginalTitleOnly(nextValue) {
    saveOriginalTitleOnly(nextValue);
    setOriginalTitleOnly(nextValue);
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
    const value = auth.trim();
    saveAuth(value);
    setAuth(value);
    setSavedAuth(value);
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
    setIncludeAdult(false);
    setAutoAlternateSearch(true);
    setDanishOnly(false);
    setOriginalTitleOnly(false);
    setLanguage("da-DK");
    setConnectionMode(proxyConfigured ? "auto" : "direct");
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

  async function searchForType({
    searchType,
    trimmedQuery,
    signal,
    searchCriteria = {},
  }) {
    const effectiveIncludeAdult =
      searchCriteria.includeAdult ?? includeAdult;
    const effectiveDanishOnly =
      searchCriteria.danishOnly ?? danishOnly;
    const effectiveOriginalTitleOnly =
      searchCriteria.originalTitleOnly ?? originalTitleOnly;

    const data = await client.searchTitles({
      mediaType: searchType,
      query: trimmedQuery,
      includeAdult: effectiveIncludeAdult,
      language,
      page: 1,
      signal,
    });

    return filterSearchResults(data?.results, {
      mediaType: searchType,
      query: trimmedQuery,
      includeAdult: effectiveIncludeAdult,
      danishOnly: effectiveDanishOnly,
      originalTitleOnly: effectiveOriginalTitleOnly,
    });
  }

  async function doSearch() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !client.isConfigured()) return;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const initialType = mediaType;
    const alternateType = otherMediaType(initialType);

    setSearching(true);
    setSearchCompleted(false);
    setSearchNotice("");
    setResults([]);
    setSelected(null);
    setOverlaps([]);
    setOverlapStatus("idle");
    setError("");

    try {
      const initialResults = await searchForType({
        searchType: initialType,
        trimmedQuery,
        signal: controller.signal,
      });

      if (initialResults.length > 0 || !autoAlternateSearch) {
        setResults(initialResults);
        setSearchCompleted(true);
        if (!initialResults.length && !autoAlternateSearch) {
          setSearchNotice(
            `Ingen ${initialType === "tv" ? "TV-serier" : "film"} fundet.`,
          );
        }
        return;
      }

      const alternateResults = await searchForType({
        searchType: alternateType,
        trimmedQuery,
        signal: controller.signal,
      });

      if (alternateResults.length > 0) {
        setMediaType(alternateType);
        setResults(alternateResults);
        setSearchNotice(
          `Ingen ${initialType === "tv" ? "TV-serier" : "film"} fundet. Jeg søgte også som ${alternateType === "tv" ? "TV-serie" : "film"} og fandt ${alternateResults.length} resultat${alternateResults.length === 1 ? "" : "er"}.`,
        );
      } else {
        setResults([]);
        setSearchNotice(
          `Ingen resultater som ${initialType === "tv" ? "TV-serie" : "film"} eller ${alternateType === "tv" ? "TV-serie" : "film"}.`,
        );
      }
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

  async function tryOtherTypeManually() {
    const nextType = otherMediaType(mediaType);
    setMediaType(nextType);
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !client.isConfigured()) return;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearching(true);
    setSearchCompleted(false);
    setSearchNotice("");
    setResults([]);
    setSelected(null);
    setOverlaps([]);
    setOverlapStatus("idle");
    setError("");

    try {
      const nextResults = await searchForType({
        searchType: nextType,
        trimmedQuery,
        signal: controller.signal,
      });
      setResults(nextResults);
      setSearchNotice(
        nextResults.length
          ? `Søgt som ${nextType === "tv" ? "TV-serie" : "film"}.`
          : `Ingen ${nextType === "tv" ? "TV-serier" : "film"} fundet.`,
      );
      setSearchCompleted(true);
    } catch (searchError) {
      if (searchError?.name === "AbortError") return;
      setError(searchError.message || String(searchError));
    } finally {
      if (searchAbortRef.current === controller) setSearching(false);
    }
  }

  async function runSmartSearch(option) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !client.isConfigured()) return;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const initialType = mediaType;
    const alternateType = otherMediaType(initialType);
    const nextCriteria = {
      includeAdult,
      danishOnly: option.danishOnly,
      originalTitleOnly: option.originalTitleOnly,
    };

    setSmartSearchCriteria(nextCriteria);
    setSearching(true);
    setSearchCompleted(false);
    setSearchNotice("");
    setResults([]);
    setSelected(null);
    setOverlaps([]);
    setOverlapStatus("idle");
    setError("");

    try {
      const initialResults = await searchForType({
        searchType: initialType,
        trimmedQuery,
        signal: controller.signal,
        searchCriteria: nextCriteria,
      });

      if (initialResults.length > 0) {
        setResults(initialResults);
        setSearchNotice(
          `Jeg udvidede søgningen ved at lempe ${option.reason}.`,
        );
        setSearchCompleted(true);
        return;
      }

      if (!autoAlternateSearch) {
        setResults([]);
        setSearchNotice(
          `Ingen ${initialType === "tv" ? "TV-serier" : "film"} fundet med den bredere søgning.`,
        );
        setSearchCompleted(true);
        return;
      }

      const alternateResults = await searchForType({
        searchType: alternateType,
        trimmedQuery,
        signal: controller.signal,
        searchCriteria: nextCriteria,
      });

      if (alternateResults.length > 0) {
        setMediaType(alternateType);
        setResults(alternateResults);
        setSearchNotice(
          `Ingen ${initialType === "tv" ? "TV-serier" : "film"} fundet. Jeg udvidede søgningen ved at lempe ${option.reason} og fandt ${alternateResults.length} resultat${alternateResults.length === 1 ? "" : "er"} som ${alternateType === "tv" ? "TV-serie" : "film"}.`,
        );
      } else {
        setResults([]);
        setSearchNotice(
          `Ingen resultater med den bredere søgning.`,
        );
      }
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

  function openSettings() {
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
  }

  function showAbout() {
    window.location.hash = "about";
  }

  function showHome() {
    window.location.hash = "home";
  }

  if (page === "about") {
    return (
      <div className="min-h-screen bg-slate-900 p-4 text-slate-100 md:p-8">
        <AboutPage onBack={showHome} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 text-slate-100 md:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={showHome}
            className="group flex min-w-0 items-center gap-3 rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
            aria-label="Gå til forsiden"
          >
            <img
              src={`${import.meta.env.BASE_URL}icons/icon.svg`}
              alt=""
              className="h-12 w-12 rounded-xl ring-1 ring-slate-700 transition group-hover:ring-yellow-400/50"
            />
            <span className="min-w-0">
              <span className="block text-lg font-semibold tracking-tight md:text-xl">TAXA-overlap</span>
              <span className="block truncate text-xs text-slate-400">Find TAXA-skuespillere i film og serier</span>
            </span>
          </button>

          <div className="flex flex-shrink-0 items-center gap-2">
            <div className="hidden text-right text-xs text-slate-500 sm:block">
              {activeSource === "direct"
                ? "Direkte TMDB"
                : activeSource === "direct-fallback"
                  ? "Direkte fallback"
                  : proxyConfigured
                    ? "Via TAXA"
                    : "TMDB"}
            </div>
            <IconButton label="Om TAXA-overlap" onClick={showAbout}>
              <span aria-hidden="true" className="text-base font-semibold">i</span>
            </IconButton>
            <IconButton label="Indstillinger" onClick={openSettings}>
              <span aria-hidden="true" className="text-xl">⚙</span>
            </IconButton>
          </div>
        </header>

        <SearchPanel
          mediaType={mediaType}
          onMediaTypeChange={changeMediaType}
          query={query}
          onQueryChange={setQuery}
          onSearch={doSearch}
          searching={searching}
          connectionReady={connectionReady}
          statusItems={searchStatusItems}
        />

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl bg-red-900/30 p-4 text-sm text-red-200 ring-1 ring-red-800"
          >
            {error}
          </div>
        )}

        <SearchResults
          sectionRef={searchResultsRef}
          results={results}
          mediaType={mediaType}
          searching={searching}
          searchCompleted={searchCompleted}
          onSelect={checkSelected}
          searchNotice={searchNotice}
          onTryOtherType={autoAlternateSearch && searchNotice ? null : tryOtherTypeManually}
          smartSearchOptions={buildSmartSearchOptions(
            smartSearchCriteria || { danishOnly, originalTitleOnly },
          )}
          onSmartSearch={runSmartSearch}
        />

        <OverlapResults
          sectionRef={overlapRef}
          selected={selected}
          mediaType={mediaType}
          status={overlapStatus}
          overlaps={overlaps}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
        />

        <footer className="mt-10 flex items-center justify-between gap-4 border-t border-slate-800 pt-4 text-xs text-slate-500">
          <button
            type="button"
            onClick={showAbout}
            className="hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
          >
            Om og datakilder
          </button>
          <span>Version {APP_VERSION}</span>
        </footer>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={closeSettings}
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
        language={language}
        onLanguageChange={changeLanguage}
        includeAdult={includeAdult}
        onIncludeAdultChange={changeIncludeAdult}
        autoAlternateSearch={autoAlternateSearch}
        onAutoAlternateSearchChange={changeAutoAlternateSearch}
        danishOnly={danishOnly}
        onDanishOnlyChange={changeDanishOnly}
        originalTitleOnly={originalTitleOnly}
        onOriginalTitleOnlyChange={changeOriginalTitleOnly}
        taxaCount={taxaMap.size}
        taxaMeta={taxaMeta}
        taxaLoading={taxaLoading}
        onRefreshTaxa={refreshTaxa}
        onClearAll={removeAllData}
        activeSource={activeSource}
        connectionReady={connectionReady}
      />
    </div>
  );
}
