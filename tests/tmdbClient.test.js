import test from "node:test";
import assert from "node:assert/strict";
import {
  CONNECTION_MODES,
  buildDirectUrl,
  createTmdbClient,
  detectAuthType,
  isBearer,
} from "../src/api/tmdbClient.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("auth-type genkender v3 og v4", () => {
  assert.equal(detectAuthType(""), "none");
  assert.equal(detectAuthType("abcd1234efgh5678"), "v3-apikey");
  assert.equal(detectAuthType("Bearer abc.def.ghi"), "v4-bearer");
  assert.equal(isBearer("Bearer abc.def.ghi"), true);
});

test("v3-nøgle placeres i query string", () => {
  const url = new URL(buildDirectUrl("/search/tv", { query: "Taxa" }, "key123"));
  assert.equal(url.searchParams.get("query"), "Taxa");
  assert.equal(url.searchParams.get("api_key"), "key123");
});

test("auto bruger proxy først og direkte TMDB som fallback", async () => {
  const calls = [];
  const sources = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (String(url).startsWith("https://proxy.example")) {
      return jsonResponse({ message: "nede" }, 503);
    }
    return jsonResponse({ results: [{ id: 1 }] });
  };

  const client = createTmdbClient({
    mode: CONNECTION_MODES.AUTO,
    auth: "direct-key",
    proxyBaseUrl: "https://proxy.example/tmdb",
    fetchImpl,
    onSource: (source) => sources.push(source),
  });

  const result = await client.searchTitles({
    mediaType: "tv",
    query: "Taxa",
    language: "da-DK",
    includeAdult: false,
    page: 1,
  });

  assert.equal(result.results[0].id, 1);
  assert.equal(calls.length, 2);
  assert.equal(sources.at(-1), "direct-fallback");
});

test("direkte klient kræver en nøgle", async () => {
  const client = createTmdbClient({
    mode: CONNECTION_MODES.DIRECT,
    auth: "",
    fetchImpl: async () => jsonResponse({}),
  });

  assert.equal(client.isConfigured(), false);
  await assert.rejects(
    () =>
      client.searchTitles({
        mediaType: "tv",
        query: "Taxa",
        language: "da-DK",
        includeAdult: false,
        page: 1,
      }),
    /Angiv en TMDB API-nøgle/,
  );
});
