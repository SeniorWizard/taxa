export const APP_VERSION = "1.1.0";
export const TAXA_TV_ID = 51261;
export const TMDB_API_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
export const TAXA_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export const PROXY_BASE_URL = String(
  import.meta.env?.VITE_TMDB_PROXY_URL || "",
).replace(/\/+$/, "");
