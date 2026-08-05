import test from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEYS,
  readTaxaCache,
  safeJsonParse,
  writeTaxaCache,
} from "../src/storage/localStorage.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("safeJsonParse tåler ødelagt localStorage", () => {
  assert.equal(safeJsonParse("{ødelagt", null), null);
});

test("TAXA-cache er kun gyldig for samme sprog", () => {
  const storage = memoryStorage();
  writeTaxaCache({ cast: [] }, "da-DK", storage);

  assert.ok(readTaxaCache("da-DK", 1000, storage));
  assert.equal(readTaxaCache("en-US", 1000, storage), null);
});

test("gammel cache markeres som ikke frisk", () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEYS.taxa, JSON.stringify({ cast: [] }));
  storage.setItem(
    STORAGE_KEYS.taxaMeta,
    JSON.stringify({ savedAt: Date.now() - 10_000, language: "da-DK" }),
  );

  assert.equal(readTaxaCache("da-DK", 1000, storage).fresh, false);
});
