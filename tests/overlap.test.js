import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReferenceMap,
  compareMatches,
  findOverlaps,
  tmdbImageUrl,
  yearFrom,
} from "../src/domain/overlap.js";

test("buildReferenceMap summerer episodeantal", () => {
  const map = buildReferenceMap({
    cast: [
      {
        id: 1,
        name: "A",
        roles: [
          { character: "En", episode_count: 2 },
          { character: "To", episode_count: 3 },
        ],
      },
    ],
  });

  assert.equal(map.get(1).episodesTotal, 5);
  assert.equal(map.get(1).referenceRoles.length, 2);
});

test("TV sorterer som version 1.0: reference, valgt serie, navn", () => {
  const input = [
    { name: "A", referenceEpisodes: 5, hereEpisodes: 10 },
    { name: "B", referenceEpisodes: 5, hereEpisodes: 2 },
    { name: "C", referenceEpisodes: 7, hereEpisodes: 1 },
  ];

  assert.deepEqual(
    [...input].sort(compareMatches("tv", "reference")).map((x) => x.name),
    ["C", "A", "B"],
  );
  assert.deepEqual(
    [...input].sort(compareMatches("tv", "here")).map((x) => x.name),
    ["A", "B", "C"],
  );
  assert.deepEqual(
    [...input].sort(compareMatches("tv", "name")).map((x) => x.name),
    ["A", "B", "C"],
  );
});

test("film respekterer billing order 0", () => {
  const input = [
    { name: "B", referenceEpisodes: 3, hereOrder: 1 },
    { name: "A", referenceEpisodes: 3, hereOrder: 0 },
  ];

  assert.deepEqual(
    [...input].sort(compareMatches("movie", "here")).map((x) => x.name),
    ["A", "B"],
  );
});

test("findOverlaps matcher på TMDB person-id", () => {
  const referenceMap = buildReferenceMap({
    cast: [
      {
        id: 10,
        name: "Skuespiller",
        roles: [{ character: "Chauffør", episode_count: 4 }],
      },
    ],
  });

  const result = findOverlaps(
    [
      { id: 10, name: "Skuespiller", character: "Læge", order: 0 },
      { id: 11, name: "Anden", character: "Anden", order: 1 },
    ],
    referenceMap,
    "movie",
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].personId, 10);
  assert.equal(result[0].hereRoles[0].character, "Læge");
  assert.equal(result[0].referenceEpisodes, 4);
});

test("billed-URL og årstal normaliseres", () => {
  assert.equal(
    tmdbImageUrl("/foo.jpg", "w92"),
    "https://image.tmdb.org/t/p/w92/foo.jpg",
  );
  assert.equal(tmdbImageUrl(null), null);
  assert.equal(yearFrom({ first_air_date: "1997-10-10" }, "tv"), "1997");
  assert.equal(yearFrom({ release_date: "1972-01-01" }, "movie"), "1972");
});
