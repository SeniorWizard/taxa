import { TMDB_IMAGE_BASE } from "../config.js";

const FALLBACK_ORDER = Number.MAX_SAFE_INTEGER;

function numeric(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function buildReferenceMap(aggregateCredits) {
  const map = new Map();
  const cast = Array.isArray(aggregateCredits?.cast)
    ? aggregateCredits.cast
    : [];

  for (const person of cast) {
    if (!person?.id) continue;

    const roles = Array.isArray(person.roles) ? person.roles : [];
    const referenceRoles = roles.map((role) => ({
      character: role?.character || "(ukendt)",
      episodes:
        role?.episode_count ?? role?.total_episode_count ?? null,
    }));

    const episodesTotal = referenceRoles.reduce(
      (total, role) => total + numeric(role.episodes),
      0,
    );

    map.set(person.id, {
      id: person.id,
      name: person.name || "(ukendt)",
      referenceRoles,
      episodesTotal,
      profilePath: person.profile_path || null,
    });
  }

  return map;
}

export function rolesFromCreditItem(item, mediaType) {
  if (mediaType === "movie") {
    return [
      {
        character:
          item?.character || item?.roles?.[0]?.character || "(ukendt)",
        episodes: null,
      },
    ];
  }

  const roles = Array.isArray(item?.roles) ? item.roles : [];
  if (!roles.length && item?.character) {
    return [
      {
        character: item.character,
        episodes: item?.episode_count ?? null,
      },
    ];
  }

  return roles.map((role) => ({
    character: role?.character || "(ukendt)",
    episodes: role?.episode_count ?? role?.total_episode_count ?? null,
  }));
}

export function computeHereStats(item, mediaType) {
  if (mediaType === "tv") {
    const roles = Array.isArray(item?.roles) ? item.roles : [];
    return {
      hereEpisodes: roles.reduce(
        (total, role) =>
          total +
          numeric(role?.episode_count ?? role?.total_episode_count),
        0,
      ),
      hereOrder: null,
    };
  }

  return {
    hereEpisodes: 0,
    hereOrder: Number.isFinite(item?.order)
      ? item.order
      : FALLBACK_ORDER,
  };
}

export function compareMatches(mediaType, sortMode = "reference") {
  return (a, b) => {
    const byName = a.name.localeCompare(b.name, "da");

    if (sortMode === "name") return byName;

    if (mediaType === "tv") {
      if (sortMode === "here") {
        const byHere = numeric(b.hereEpisodes) - numeric(a.hereEpisodes);
        if (byHere !== 0) return byHere;

        const byReference =
          numeric(b.referenceEpisodes) - numeric(a.referenceEpisodes);
        if (byReference !== 0) return byReference;
        return byName;
      }

      const byReference =
        numeric(b.referenceEpisodes) - numeric(a.referenceEpisodes);
      if (byReference !== 0) return byReference;

      const byHere = numeric(b.hereEpisodes) - numeric(a.hereEpisodes);
      if (byHere !== 0) return byHere;
      return byName;
    }

    if (sortMode === "here") {
      const byOrder =
        (a.hereOrder ?? FALLBACK_ORDER) -
        (b.hereOrder ?? FALLBACK_ORDER);
      if (byOrder !== 0) return byOrder;

      const byReference =
        numeric(b.referenceEpisodes) - numeric(a.referenceEpisodes);
      if (byReference !== 0) return byReference;
      return byName;
    }

    const byReference =
      numeric(b.referenceEpisodes) - numeric(a.referenceEpisodes);
    if (byReference !== 0) return byReference;

    const byOrder =
      (a.hereOrder ?? FALLBACK_ORDER) -
      (b.hereOrder ?? FALLBACK_ORDER);
    if (byOrder !== 0) return byOrder;
    return byName;
  };
}

export function findOverlaps(
  cast,
  referenceMap,
  mediaType,
  sortMode = "reference",
) {
  const matches = [];

  for (const person of Array.isArray(cast) ? cast : []) {
    const referencePerson = referenceMap.get(person?.id);
    if (!referencePerson) continue;

    const { hereEpisodes, hereOrder } = computeHereStats(
      person,
      mediaType,
    );

    matches.push({
      personId: person.id,
      name: person.name || referencePerson.name,
      hereRoles: rolesFromCreditItem(person, mediaType),
      hereEpisodes,
      hereOrder,
      referenceRoles: referencePerson.referenceRoles,
      referenceEpisodes: referencePerson.episodesTotal,
      profilePath:
        person.profile_path || referencePerson.profilePath || null,
    });
  }

  return matches.sort(compareMatches(mediaType, sortMode));
}

export function titleFor(item, mediaType) {
  if (mediaType === "tv") {
    return item?.name || item?.original_name || "(uden titel)";
  }
  return item?.title || item?.original_title || "(uden titel)";
}

export function yearFrom(item, mediaType) {
  const date =
    mediaType === "tv" ? item?.first_air_date : item?.release_date;
  return date ? String(date).slice(0, 4) : "";
}

export function tmdbImageUrl(path, size = "w185") {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
