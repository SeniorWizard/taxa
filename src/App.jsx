import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createTmdbClient } from "./api/tmdbClient.js";
import { AboutPage } from "./components/AboutPage.jsx";
import { OverlapResults } from "./components/OverlapResults.jsx";
import { SearchPanel } from "./components/SearchPanel.jsx";
import { SearchResults } from "./components/SearchResults.jsx";
import { SettingsPanel } from "./components/SettingsPanel.jsx";
import { IconButton } from "./components/ui.jsx";
import { InfoIcon, SettingsIcon } from "./components/icons.jsx";
import {
  APP_VERSION,
  DEFAULT_LANGUAGE,
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
  loadOrCreateProxyClientId,
  readTaxaCache,
  saveAuth,
  saveConnectionMode,
  saveIncludeAdult,
  saveAutoAlternateSearch,
  saveDanishOnly,
  saveOriginalTitleOnly,
  writeTaxaCache,
} from "./storage/localStorage.js";
import {
  buildSmartSearchOptions,
  filterSearchResults,
  otherMediaType,
  buildSearchStatusItems,
  mergeUniqueSearchResults,
  shouldContinueFilteredSearch,
} from "./domain/search.js";

const proxyConfigured = Boolean(PROXY_BASE_URL);
const SEARCH_RESULT_BATCH_SIZE = 20;
const ZERO_HIT_PAGE_SCAN = 3;

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

  const language = DEFAULT_LANGUAGE;
  const [includeAdult, setIncludeAdult] = useState(() => loadIncludeAdult());
  const [autoAlternateSearch, setAutoAlternateSearch] = useState(() => loadAutoAlternateSearch());
  const [danishOnly, setDanishOnly] = useState(() => loadDanishOnly());
  const [originalTitleOnly, setOriginalTitleOnly] = useState(() => loadOriginalTitleOnly());
  const [mediaType, setMediaType] = useState("tv");
  const [query, setQuery] = useState("");

  const [searching, setSearching] = useState(false);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [searchNotice, setSearchNotice] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchPage, setSearchPage] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
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
        includeAdult,
        danishOnly,
        originalTitleOnly,
        autoAlternateSearch,
      }),
    [
      connectionMode,
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
        throw new Error("Vælg Via TAXA eller angiv din egen TMDB-nøgle først.");
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
    setSearchPage(0);
    setSearchTotalPages(0);
    setLoadingMore(false);
    setSearchCompleted(false);
    setSearchNotice("");
    setActiveSearchQuery("");
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

  async function fetchSearchPage({
    searchType,
    trimmedQuery,
    page = 1,
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
      page,
      signal,
    });

    const responsePage = Math.max(1, Number(data?.page || page) || page);
    const totalPages = Math.min(
      500,
      Math.max(
        responsePage,
        Number(data?.total_pages || responsePage) || responsePage,
      ),
    );

    return {
      items: filterSearchResults(data?.results, {
        mediaType: searchType,
        query: trimmedQuery,
        includeAdult: effectiveIncludeAdult,
        danishOnly: effectiveDanishOnly,
        originalTitleOnly: effectiveOriginalTitleOnly,
      }),
      page: responsePage,
      totalPages,
      totalResults: Number(data?.total_results || 0) || 0,
    };
  }

  async function searchForType({
    searchType,
    trimmedQuery,
    signal,
    searchCriteria = {},
    startPage = 1,
    targetCount = SEARCH_RESULT_BATCH_SIZE,
    zeroHitPageLimit = ZERO_HIT_PAGE_SCAN,
  }) {
    let page = Math.max(1, Number(startPage) || 1);
    let totalPages = page;
    let totalResults = 0;
    let items = [];
    let scanned = 0;

    while (page <= totalPages) {
      const response = await fetchSearchPage({
        searchType,
        trimmedQuery,
        page,
        signal,
        searchCriteria,
      });

      items = mergeUniqueSearchResults(items, response.items);
      totalPages = response.totalPages;
      totalResults = response.totalResults;
      scanned += 1;

      if (!shouldContinueFilteredSearch({
        filteredCount: items.length,
        targetCount,
        page: response.page,
        totalPages,
        scannedPages: scanned,
        zeroHitPageLimit,
      })) {
        return {
          items,
          page: response.page,
          totalPages,
          totalResults,
        };
      }

      page = response.page + 1;
    }

    return {
      items,
      page: Math.min(page - 1, totalPages),
      totalPages,
      totalResults,
    };
  }

  function applySearchResponse(response) {
    setResults(response.items);
    setSearchPage(response.page);
    setSearchTotalPages(response.totalPages);
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
    setLoadingMore(false);
    setSearchCompleted(false);
    setSearchNotice("");
    setActiveSearchQuery(trimmedQuery);
    setResults([]);
    setSearchPage(0);
    setSearchTotalPages(0);
    setSmartSearchCriteria(null);
    setSelected(null);
    setOverlaps([]);
    setOverlapStatus("idle");
    setError("");

    try {
      const initialResponse = await searchForType({
        searchType: initialType,
        trimmedQuery,
        signal: controller.signal,
      });

      if (initialResponse.items.length > 0 || !autoAlternateSearch) {
        applySearchResponse(initialResponse);
        setSearchCompleted(true);
        if (!initialResponse.items.length && !autoAlternateSearch) {
          setSearchNotice(
            `Ingen ${initialType === "tv" ? "TV-serier" : "film"} fundet.`,
          );
        }
        return;
      }

      const alternateResponse = await searchForType({
        searchType: alternateType,
        trimmedQuery,
        signal: controller.signal,
      });

      if (alternateResponse.items.length > 0) {
        setMediaType(alternateType);
        applySearchResponse(alternateResponse);
        setSearchNotice(
          `Ingen ${initialType === "tv" ? "TV-serier" : "film"} fundet. Jeg søgte også som ${alternateType === "tv" ? "TV-serie" : "film"} og fandt ${alternateResponse.items.length} resultat${alternateResponse.items.length === 1 ? "" : "er"}.`,
        );
      } else {
        setResults([]);
        setSearchPage(alternateResponse.page);
        setSearchTotalPages(alternateResponse.totalPages);
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
    setLoadingMore(false);
    setSearchCompleted(false);
    setSearchNotice("");
    setActiveSearchQuery(trimmedQuery);
    setResults([]);
    setSearchPage(0);
    setSearchTotalPages(0);
    setSmartSearchCriteria(null);
    setSelected(null);
    setOverlaps([]);
    setOverlapStatus("idle");
    setError("");

    try {
      const response = await searchForType({
        searchType: nextType,
        trimmedQuery,
        signal: controller.signal,
      });
      applySearchResponse(response);
      setSearchNotice(
        response.items.length
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
    setLoadingMore(false);
    setSearchCompleted(false);
    setSearchNotice("");
    setActiveSearchQuery(trimmedQuery);
    setResults([]);
    setSearchPage(0);
    setSearchTotalPages(0);
    setSelected(null);
    setOverlaps([]);
    setOverlapStatus("idle");
    setError("");

    try {
      const initialResponse = await searchForType({
        searchType: initialType,
        trimmedQuery,
        signal: controller.signal,
        searchCriteria: nextCriteria,
      });

      if (initialResponse.items.length > 0) {
        applySearchResponse(initialResponse);
        setSearchNotice(
          `Jeg udvidede søgningen ved at lempe ${option.reason}.`,
        );
        setSearchCompleted(true);
        return;
      }

      if (!autoAlternateSearch) {
        applySearchResponse(initialResponse);
        setSearchNotice(
          `Ingen ${initialType === "tv" ? "TV-serier" : "film"} fundet med den bredere søgning.`,
        );
        setSearchCompleted(true);
        return;
      }

      const alternateResponse = await searchForType({
        searchType: alternateType,
        trimmedQuery,
        signal: controller.signal,
        searchCriteria: nextCriteria,
      });

      if (alternateResponse.items.length > 0) {
        setMediaType(alternateType);
        applySearchResponse(alternateResponse);
        setSearchNotice(
          `Ingen ${initialType === "tv" ? "TV-serier" : "film"} fundet. Jeg udvidede søgningen ved at lempe ${option.reason} og fandt ${alternateResponse.items.length} resultat${alternateResponse.items.length === 1 ? "" : "er"} som ${alternateType === "tv" ? "TV-serie" : "film"}.`,
        );
      } else {
        applySearchResponse(alternateResponse);
        setSearchNotice(
          "Ingen resultater med den bredere søgning.",
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

  async function loadMoreSearchResults() {
    const trimmedQuery = activeSearchQuery;
    if (
      loadingMore ||
      !trimmedQuery ||
      !client.isConfigured() ||
      searchPage >= searchTotalPages
    ) {
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setLoadingMore(true);
    setError("");

    const criteria = smartSearchCriteria || {
      includeAdult,
      danishOnly,
      originalTitleOnly,
    };

    let nextPage = searchPage + 1;
    let latestPage = searchPage;
    let latestTotalPages = searchTotalPages;
    let mergedResults = results;
    const targetCount = results.length + SEARCH_RESULT_BATCH_SIZE;

    try {
      while (
        mergedResults.length < targetCount &&
        nextPage <= latestTotalPages
      ) {
        const response = await fetchSearchPage({
          searchType: mediaType,
          trimmedQuery,
          page: nextPage,
          signal: controller.signal,
          searchCriteria: criteria,
        });

        mergedResults = mergeUniqueSearchResults(
          mergedResults,
          response.items,
        );
        latestPage = response.page;
        latestTotalPages = response.totalPages;
        nextPage = response.page + 1;
      }

      setResults(mergedResults);
      setSearchPage(latestPage);
      setSearchTotalPages(latestTotalPages);
    } catch (searchError) {
      if (searchError?.name === "AbortError") return;
      setError(searchError.message || String(searchError));
    } finally {
      if (searchAbortRef.current === controller) {
        setLoadingMore(false);
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

  function changeSelectedTitle() {
    creditsAbortRef.current?.abort();
    if (activeSearchQuery) setQuery(activeSearchQuery);
    setSelected(null);
    setOverlaps([]);
    setOverlapStatus("idle");
    setError("");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        searchResultsRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
        searchResultsRef.current?.focus({ preventScroll: true });
      });
    });
  }

  function startNewSearch() {
    resetResultState();
    setQuery("");
    requestAnimationFrame(() => {
      const input = document.getElementById("title-search");
      input?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
      });
      input?.focus({ preventScroll: true });
    });
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
              src={`${import.meta.env.BASE_URL}icons/logo.png`}
              alt="TAXA"
              className="h-13 w-auto max-w-[7.75rem] object-contain object-left transition group-hover:brightness-110 md:h-14 md:max-w-[8.5rem]"
            />
            <span className="hidden min-w-0 sm:block">
              <span className="block text-lg font-semibold tracking-tight md:text-xl">overlap</span>
              <span className="block truncate text-xs text-slate-400">Find TAXA-skuespillere i film og serier</span>
            </span>
          </button>

          <div className="flex flex-shrink-0 items-center gap-2">
            <IconButton label="Om TAXA-overlap" onClick={showAbout} className="brand-icon-button">
              <InfoIcon className="h-8 w-8" />
            </IconButton>
            <IconButton label="Indstillinger" onClick={openSettings} className="brand-icon-button">
              <SettingsIcon className="h-8 w-8" />
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

        {!selected && (
          <SearchResults
            sectionRef={searchResultsRef}
            results={results}
            mediaType={mediaType}
            searching={searching}
            loadingMore={loadingMore}
            hasMore={searchPage > 0 && searchPage < searchTotalPages}
            onLoadMore={loadMoreSearchResults}
            searchCompleted={searchCompleted}
            onSelect={checkSelected}
            searchNotice={searchNotice}
            onTryOtherType={autoAlternateSearch && searchNotice ? null : tryOtherTypeManually}
            smartSearchOptions={buildSmartSearchOptions(
              smartSearchCriteria || { danishOnly, originalTitleOnly },
            )}
            onSmartSearch={runSmartSearch}
          />
        )}

        <OverlapResults
          sectionRef={overlapRef}
          selected={selected}
          mediaType={mediaType}
          status={overlapStatus}
          overlaps={overlaps}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          onChangeTitle={changeSelectedTitle}
          onNewSearch={startNewSearch}
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
