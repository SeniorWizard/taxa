import { CONNECTION_MODES } from "../api/tmdbClient.js";

export const STORAGE_KEYS = Object.freeze({
  taxa: "tmdb_taxa_aggregate_credits_v1",
  taxaMeta: "tmdb_taxa_aggregate_meta_v1",
  auth: "tmdb_auth_v1",
  language: "tmdb_lang_v1",
  connectionMode: "tmdb_connection_mode_v1",
});

function storageOrThrow(storage) {
  if (!storage) throw new Error("localStorage er ikke tilgængelig.");
  return storage;
}

export function safeJsonParse(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function loadAuth(storage = globalThis.localStorage) {
  return storageOrThrow(storage).getItem(STORAGE_KEYS.auth) || "";
}

export function saveAuth(auth, storage = globalThis.localStorage) {
  const value = auth.trim();
  if (!value) return;
  storageOrThrow(storage).setItem(STORAGE_KEYS.auth, value);
}

export function clearAuth(storage = globalThis.localStorage) {
  storageOrThrow(storage).removeItem(STORAGE_KEYS.auth);
}

export function loadLanguage(storage = globalThis.localStorage) {
  return storageOrThrow(storage).getItem(STORAGE_KEYS.language) || "da-DK";
}

export function saveLanguage(language, storage = globalThis.localStorage) {
  storageOrThrow(storage).setItem(STORAGE_KEYS.language, language);
}

export function loadConnectionMode(
  proxyConfigured,
  storage = globalThis.localStorage,
) {
  const saved = storageOrThrow(storage).getItem(
    STORAGE_KEYS.connectionMode,
  );
  const valid = Object.values(CONNECTION_MODES).includes(saved);
  if (valid) {
    if (!proxyConfigured && saved !== CONNECTION_MODES.DIRECT) {
      return CONNECTION_MODES.DIRECT;
    }
    return saved;
  }
  return proxyConfigured
    ? CONNECTION_MODES.AUTO
    : CONNECTION_MODES.DIRECT;
}

export function saveConnectionMode(
  mode,
  storage = globalThis.localStorage,
) {
  storageOrThrow(storage).setItem(STORAGE_KEYS.connectionMode, mode);
}

export function readTaxaCache(
  language,
  maxAgeMs,
  storage = globalThis.localStorage,
) {
  const target = storageOrThrow(storage);
  const data = safeJsonParse(target.getItem(STORAGE_KEYS.taxa));
  const meta = safeJsonParse(target.getItem(STORAGE_KEYS.taxaMeta));

  if (!data) return null;

  const languageMatches = !meta?.language || meta.language === language;
  if (!languageMatches) return null;

  const savedAt = Number(meta?.savedAt || 0);
  const fresh =
    savedAt > 0 &&
    Number.isFinite(maxAgeMs) &&
    Date.now() - savedAt < maxAgeMs;

  return { data, meta: meta || null, fresh };
}

export function writeTaxaCache(
  data,
  language,
  storage = globalThis.localStorage,
) {
  const target = storageOrThrow(storage);
  const meta = { savedAt: Date.now(), language };
  target.setItem(STORAGE_KEYS.taxa, JSON.stringify(data));
  target.setItem(STORAGE_KEYS.taxaMeta, JSON.stringify(meta));
  return meta;
}

export function clearTaxaCache(storage = globalThis.localStorage) {
  const target = storageOrThrow(storage);
  target.removeItem(STORAGE_KEYS.taxa);
  target.removeItem(STORAGE_KEYS.taxaMeta);
}

export function clearAppData(storage = globalThis.localStorage) {
  clearAuth(storage);
  clearTaxaCache(storage);
}
