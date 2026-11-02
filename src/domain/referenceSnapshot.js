function numeric(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function buildReferenceMapFromSnapshot(snapshot) {
  const map = new Map();
  const people = snapshot?.people && typeof snapshot.people === "object"
    ? snapshot.people
    : {};

  for (const [rawId, person] of Object.entries(people)) {
    const id = numeric(person?.tmdb_id ?? rawId);
    if (!id) continue;

    const roles = Array.isArray(person?.roles) ? person.roles : [];
    const referenceRoles = roles.map((role) => ({
      character: role?.character || "(ukendt)",
      episodes: role?.episode_count ?? null,
    }));

    map.set(id, {
      id,
      name: person?.name || "(ukendt)",
      referenceRoles,
      episodesTotal: numeric(
        person?.aggregate_episode_count,
        referenceRoles.reduce(
          (total, role) => total + numeric(role.episodes),
          0,
        ),
      ),
      profilePath: person?.profile_path || null,
    });
  }

  return map;
}

export function episodeDetailsForPerson(snapshot, personId) {
  if (!snapshot?.people || !snapshot?.episodes) return [];

  const person = snapshot.people[String(personId)] ?? snapshot.people[personId];
  const keys = Array.isArray(person?.episodes) ? person.episodes : [];

  return keys
    .map((key) => {
      const episode = snapshot.episodes[key];
      if (!episode || typeof episode !== "object") return null;
      return { key, ...episode };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const bySeason = numeric(a.season) - numeric(b.season);
      if (bySeason !== 0) return bySeason;
      return numeric(a.episode) - numeric(b.episode);
    });
}

export function episodeCountForDisplay(episodeDetails, aggregateCount = 0) {
  const indexedCount = Array.isArray(episodeDetails) ? episodeDetails.length : 0;
  return indexedCount > 0 ? indexedCount : numeric(aggregateCount);
}

export function splitRegularAndSpecialEpisodes(episodes) {
  const regular = [];
  const specials = [];

  for (const episode of Array.isArray(episodes) ? episodes : []) {
    if (numeric(episode?.season, -1) === 0) specials.push(episode);
    else regular.push(episode);
  }

  return { regular, specials };
}

export function formatEpisodeDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
