import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReferenceMapFromSnapshot,
  episodeCountForDisplay,
  episodeDetailsForPerson,
  formatEpisodeDate,
  splitRegularAndSpecialEpisodes,
} from "../src/domain/referenceSnapshot.js";

const snapshot = {
  people: {
    10: {
      tmdb_id: 10,
      name: "Person A",
      profile_path: "/a.jpg",
      aggregate_episode_count: 2,
      roles: [{ character: "Mike", episode_count: 2 }],
      episodes: ["S01E02", "S00E01", "S01E01"],
    },
  },
  episodes: {
    S00E01: { season: 0, episode: 1, name: "Farvel", air_date: "1999-12-19" },
    S01E01: { season: 1, episode: 1, name: "Første", air_date: "1997-09-14" },
    S01E02: { season: 1, episode: 2, name: "Anden", air_date: "1997-09-21" },
  },
};

test("snapshot kan bruges som overlap-reference", () => {
  const map = buildReferenceMapFromSnapshot(snapshot);
  assert.equal(map.get(10).name, "Person A");
  assert.equal(map.get(10).episodesTotal, 2);
  assert.equal(map.get(10).referenceRoles[0].character, "Mike");
});

test("episodeindeks slår personens nøgler op og sorterer stabilt", () => {
  const episodes = episodeDetailsForPerson(snapshot, 10);
  assert.deepEqual(episodes.map((episode) => episode.key), ["S00E01", "S01E01", "S01E02"]);

  const split = splitRegularAndSpecialEpisodes(episodes);
  assert.deepEqual(split.specials.map((episode) => episode.key), ["S00E01"]);
  assert.deepEqual(split.regular.map((episode) => episode.key), ["S01E01", "S01E02"]);
});

test("vist episodeantal inkluderer specials når episodeindekset findes", () => {
  const episodes = episodeDetailsForPerson(snapshot, 10);
  assert.equal(episodeCountForDisplay(episodes, 2), 3);
  assert.equal(episodeCountForDisplay([], 2), 2);
});

test("episode-dato formatteres på dansk", () => {
  assert.match(formatEpisodeDate("1999-12-19"), /1999/);
  assert.equal(formatEpisodeDate(null), "");
});
