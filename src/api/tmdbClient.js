import { TMDB_API_BASE, TAXA_TV_ID } from "../config.js";

export const CONNECTION_MODES = Object.freeze({
  AUTO: "auto",
  PROXY: "proxy",
  DIRECT: "direct",
});

export class TmdbRequestError extends Error {
  constructor(message, { status = 0, source = "unknown", cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "TmdbRequestError";
    this.status = status;
    this.source = source;
  }
}

export function isBearer(auth = "") {
  const input = auth.trim();
  return (
    input.toLowerCase().startsWith("bearer ") ||
    /^(?:BEARER\s+)?[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}$/i.test(
      input,
    )
  );
}

export function detectAuthType(auth = "") {
  if (!auth.trim()) return "none";
  return isBearer(auth) ? "v4-bearer" : "v3-apikey";
}

export function maskAuth(auth = "") {
  const input = auth.trim();
  if (!input) return "(ingen gemt)";

  if (isBearer(input)) {
    const token = input.toLowerCase().startsWith("bearer ")
      ? input.slice(7)
      : input;
    return `Bearer ${token.slice(0, 4)}...${token.slice(-4)}`;
  }

  return `api_key ${input.slice(0, 4)}...${input.slice(-4)}`;
}

function directHeaders(auth) {
  const headers = { accept: "application/json" };
  if (isBearer(auth)) {
    headers.Authorization = auth.toLowerCase().startsWith("bearer ")
      ? auth.trim()
      : `Bearer ${auth.trim()}`;
  }
  return headers;
}

export function buildDirectUrl(path, params = {}, auth = "") {
  const url = new URL(`${TMDB_API_BASE}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  if (auth.trim() && !isBearer(auth)) {
    url.searchParams.set("api_key", auth.trim());
  }

  return url.toString();
}

function errorMessage(status, source, body) {
  const prefix = source === "proxy" ? "Proxy-fejl" : "TMDB-fejl";

  if (status === 401) {
    return `${prefix} 401: API-nøglen eller tokenet blev afvist.`;
  }
  if (status === 429) {
    return `${prefix} 429: For mange forespørgsler. Prøv igen senere.`;
  }
  if (status >= 500) {
    return `${prefix} ${status}: Tjenesten er midlertidigt utilgængelig.`;
  }

  const detail = body?.status_message || body?.message || "Ukendt fejl";
  return `${prefix} ${status}: ${detail}`;
}

async function requestJson(url, options, source, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(url, options);
  } catch (cause) {
    if (cause?.name === "AbortError") throw cause;
    throw new TmdbRequestError(
      source === "proxy"
        ? "Kunne ikke kontakte proxyen."
        : "Kunne ikke kontakte TMDB.",
      { source, cause },
    );
  }

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text.slice(0, 300) };
    }
  }

  if (!response.ok) {
    throw new TmdbRequestError(
      errorMessage(response.status, source, body),
      { status: response.status, source },
    );
  }

  return body;
}

function directProvider(auth, fetchImpl) {
  async function get(path, params, signal) {
    if (!auth.trim()) {
      throw new TmdbRequestError(
        "Angiv en TMDB API-nøgle eller et Bearer-token.",
        { source: "direct" },
      );
    }

    return requestJson(
      buildDirectUrl(path, params, auth),
      { headers: directHeaders(auth), signal },
      "direct",
      fetchImpl,
    );
  }

  return {
    searchTitles({ mediaType, query, language, includeAdult, page, signal }) {
      return get(
        mediaType === "tv" ? "/search/tv" : "/search/movie",
        {
          query,
          include_adult: includeAdult,
          language,
          page,
        },
        signal,
      );
    },

    getTitleCredits({ mediaType, id, language, signal }) {
      return get(
        mediaType === "tv"
          ? `/tv/${id}/aggregate_credits`
          : `/movie/${id}/credits`,
        { language },
        signal,
      );
    },

    getTaxaCredits({ language, signal }) {
      return get(
        `/tv/${TAXA_TV_ID}/aggregate_credits`,
        { language },
        signal,
      );
    },
  };
}

function proxyProvider(proxyBaseUrl, fetchImpl) {
  async function get(endpoint, params, signal) {
    if (!proxyBaseUrl) {
      throw new TmdbRequestError(
        "Proxyen er ikke konfigureret i dette build.",
        { source: "proxy" },
      );
    }

    const url = new URL(`${proxyBaseUrl}/${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    return requestJson(
      url.toString(),
      { headers: { accept: "application/json" }, signal },
      "proxy",
      fetchImpl,
    );
  }

  return {
    searchTitles({ mediaType, query, language, includeAdult, page, signal }) {
      return get(
        "search",
        {
          media_type: mediaType,
          query,
          language,
          include_adult: includeAdult,
          page,
        },
        signal,
      );
    },

    getTitleCredits({ mediaType, id, language, signal }) {
      return get(
        "credits",
        { media_type: mediaType, id, language },
        signal,
      );
    },

    getTaxaCredits({ language, signal }) {
      return get("reference/taxa", { language }, signal);
    },
  };
}

function canFallback(error) {
  return error?.name !== "AbortError";
}

export function createTmdbClient({
  mode = CONNECTION_MODES.DIRECT,
  auth = "",
  proxyBaseUrl = "",
  fetchImpl = globalThis.fetch,
  onSource = () => {},
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("createTmdbClient kræver en fetch-funktion.");
  }

  const direct = directProvider(auth, fetchImpl);
  const proxy = proxyProvider(proxyBaseUrl.replace(/\/+$/, ""), fetchImpl);

  async function invoke(method, args) {
    if (mode === CONNECTION_MODES.DIRECT) {
      const data = await direct[method](args);
      onSource("direct");
      return data;
    }

    if (mode === CONNECTION_MODES.PROXY) {
      const data = await proxy[method](args);
      onSource("proxy");
      return data;
    }

    if (proxyBaseUrl) {
      try {
        const data = await proxy[method](args);
        onSource("proxy");
        return data;
      } catch (error) {
        if (!auth.trim() || !canFallback(error)) throw error;
      }
    }

    const data = await direct[method](args);
    onSource(proxyBaseUrl ? "direct-fallback" : "direct");
    return data;
  }

  return {
    isConfigured() {
      if (mode === CONNECTION_MODES.DIRECT) return Boolean(auth.trim());
      if (mode === CONNECTION_MODES.PROXY) return Boolean(proxyBaseUrl);
      return Boolean(proxyBaseUrl || auth.trim());
    },

    searchTitles(args) {
      return invoke("searchTitles", args);
    },

    getTitleCredits(args) {
      return invoke("getTitleCredits", args);
    },

    getTaxaCredits(args) {
      return invoke("getTaxaCredits", args);
    },
  };
}
