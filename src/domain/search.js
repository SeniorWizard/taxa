const MEDIA_TYPES = Object.freeze({
  TV: "tv",
  MOVIE: "movie",
});

export function otherMediaType(mediaType) {
  return mediaType === MEDIA_TYPES.TV ? MEDIA_TYPES.MOVIE : MEDIA_TYPES.TV;
}

function normalizeTitle(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("da-DK")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function originalTitleFor(item, mediaType) {
  if (mediaType === MEDIA_TYPES.TV) {
    return item?.original_name || item?.name || "";
  }
  return item?.original_title || item?.title || "";
}

export function filterSearchResults(
  results,
  {
    mediaType,
    query = "",
    includeAdult = false,
    danishOnly = false,
    originalTitleOnly = false,
  } = {},
) {
  const source = Array.isArray(results) ? results : [];
  const normalizedQuery = normalizeTitle(query);

  return source.filter((item) => {
    if (!includeAdult && item?.adult === true) return false;

    if (danishOnly && item?.original_language !== "da") {
      return false;
    }

    if (originalTitleOnly) {
      const originalTitle = normalizeTitle(originalTitleFor(item, mediaType));
      if (!normalizedQuery || !originalTitle.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });
}

export function searchTitleMatchesOriginal(
  item,
  mediaType,
  query,
) {
  const normalizedQuery = normalizeTitle(query);
  if (!normalizedQuery) return true;
  return normalizeTitle(originalTitleFor(item, mediaType)).includes(
    normalizedQuery,
  );
}

export function buildSmartSearchOptions({
  danishOnly = false,
  originalTitleOnly = false,
} = {}) {
  const options = [];

  if (originalTitleOnly) {
    options.push({
      key: "original-title",
      label: "Søg også på oversatte/lokaliserede titler",
      reason: "originaltitel-filteret",
      danishOnly,
      originalTitleOnly: false,
    });
  }

  if (danishOnly) {
    options.push({
      key: "danish",
      label: "Søg også blandt udenlandske titler",
      reason: "sprogfilteret",
      danishOnly: false,
      originalTitleOnly,
    });
  }

  return options;
}


export function buildSearchStatusItems({
  connectionMode,
  language,
  includeAdult,
  danishOnly,
  originalTitleOnly,
  autoAlternateSearch,
}) {
  return [
    {
      key: "connection",
      label: connectionMode === "direct" ? "Direkte til TMDB" : "Via TAXA",
      shortLabel: connectionMode === "direct" ? "Direkte" : "Via TAXA",
      active: true,
      title:
        connectionMode === "direct"
          ? "TMDB-kald går direkte fra denne browser."
          : "TMDB-kald går via TAXA-serveren.",
    },
    {
      key: "language",
      label: language || "Sprog",
      shortLabel: language?.split("-")[0]?.toUpperCase() || "Sprog",
      active: true,
      title: `Søgesprog: ${language || "ukendt"}.`,
    },
    {
      key: "adult",
      label: "Adult",
      shortLabel: "18+",
      active: Boolean(includeAdult),
      title: includeAdult
        ? "Voksenindhold medtages i søgningen."
        : "Voksenindhold filtreres fra.",
    },
    {
      key: "original-title",
      label: "Originaltitel",
      shortLabel: "Original",
      active: Boolean(originalTitleOnly),
      title: originalTitleOnly
        ? "Resultater skal matche originaltitel/originalnavn."
        : "Oversatte og lokaliserede titler kan matches.",
    },
    {
      key: "danish",
      label: "Dansk",
      shortLabel: "DA",
      active: Boolean(danishOnly),
      title: danishOnly
        ? "Kun titler med dansk originalt sprog vises."
        : "Alle originale sprog kan vises.",
    },
    {
      key: "alternate-type",
      label: "Anden type",
      shortLabel: "TV/FILM",
      active: Boolean(autoAlternateSearch),
      title: autoAlternateSearch
        ? "Ved 0 resultater prøves den anden medietype automatisk."
        : "Den anden medietype prøves ikke automatisk.",
    },
  ];
}
