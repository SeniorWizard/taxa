import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSmartSearchOptions,
  buildSearchStatusItems,
  filterSearchResults,
  otherMediaType,
  searchTitleMatchesOriginal,
} from "../src/domain/search.js";

test("skifter korrekt mellem TV og film", () => {
  assert.equal(otherMediaType("tv"), "movie");
  assert.equal(otherMediaType("movie"), "tv");
});

test("dansksprogede resultater filtreres efter original_language", () => {
  const results = [
    { id: 1, original_language: "da" },
    { id: 2, original_language: "en" },
    { id: 3, original_language: "sv" },
  ];

  assert.deepEqual(
    filterSearchResults(results, { mediaType: "movie", danishOnly: true }).map(
      (item) => item.id,
    ),
    [1],
  );
});

test("originaltitel-filter matcher normaliseret titel", () => {
  const results = [
    { id: 1, original_title: "I Tyrens Tegn", title: "I tyrens tegn" },
    { id: 2, original_title: "The Cow Signs", title: "I tyrens tegn" },
  ];

  assert.deepEqual(
    filterSearchResults(results, {
      mediaType: "movie",
      query: "i tyrens tegn",
      originalTitleOnly: true,
    }).map((item) => item.id),
    [1],
  );
  assert.equal(
    searchTitleMatchesOriginal(results[0], "movie", "I TYRENS TEGN"),
    true,
  );
  assert.equal(
    searchTitleMatchesOriginal(results[1], "movie", "I TYRENS TEGN"),
    false,
  );
});

test("originaltitel-filter bruger original_name for TV", () => {
  const results = [
    { id: 1, original_name: "Matador", name: "Matador" },
    { id: 2, original_name: "The Bridge", name: "Broen" },
  ];

  assert.deepEqual(
    filterSearchResults(results, {
      mediaType: "tv",
      query: "broen",
      originalTitleOnly: true,
    }),
    [],
  );
});

test("adult-resultater filtreres lokalt som ekstra sikkerhedsnet", () => {
  const results = [
    { id: 1, adult: false },
    { id: 2, adult: true },
  ];

  assert.deepEqual(
    filterSearchResults(results, { mediaType: "movie", includeAdult: false }).map(
      (item) => item.id,
    ),
    [1],
  );
  assert.deepEqual(
    filterSearchResults(results, { mediaType: "movie", includeAdult: true }).map(
      (item) => item.id,
    ),
    [1, 2],
  );
});


test("smart search kan lempe originaltitel-filteret uden at ændre sprogfilteret", () => {
  const options = buildSmartSearchOptions({
    danishOnly: true,
    originalTitleOnly: true,
  });

  assert.deepEqual(options[0], {
    key: "original-title",
    label: "Søg også på oversatte/lokaliserede titler",
    reason: "originaltitel-filteret",
    danishOnly: true,
    originalTitleOnly: false,
  });
});

test("smart search kan lempe sprogfilteret uden at ændre originaltitel-filteret", () => {
  const options = buildSmartSearchOptions({
    danishOnly: true,
    originalTitleOnly: true,
  });

  assert.deepEqual(options[1], {
    key: "danish",
    label: "Søg også blandt udenlandske titler",
    reason: "sprogfilteret",
    danishOnly: false,
    originalTitleOnly: true,
  });
});

test("smart search foreslår intet når ingen blød begrænsning er aktiv", () => {
  assert.deepEqual(
    buildSmartSearchOptions({ danishOnly: false, originalTitleOnly: false }),
    [],
  );
});

test("smart search ændrer aldrig adult-kriteriet", () => {
  const options = buildSmartSearchOptions({
    danishOnly: true,
    originalTitleOnly: false,
  });
  assert.equal("includeAdult" in options[0], false);
});

test("statusbar viser søgeprofilens aktive og inaktive valg", () => {
  const items = buildSearchStatusItems({
    connectionMode: "auto",
    language: "da-DK",
    includeAdult: false,
    danishOnly: true,
    originalTitleOnly: false,
    autoAlternateSearch: true,
  });

  const byKey = Object.fromEntries(items.map((item) => [item.key, item]));

  assert.equal(items.length, 5);
  assert.equal(byKey.direct.active, false);
  assert.equal(byKey.direct.icon, "direct");
  assert.equal(byKey.danish.active, true);
  assert.equal(byKey["original-title"].active, false);
  assert.equal(byKey.adult.active, false);
  assert.equal(byKey["alternate-type"].active, true);
});
