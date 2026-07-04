import { test } from "node:test";
import assert from "node:assert/strict";
import { movieAddPayload, seriesAddPayload } from "../src/payloads.js";

test("payload de película Radarr v3", () => {
  const p = movieAddPayload(
    { tmdbId: 9, title: "Dune", titleSlug: "dune-9", year: 2021 }, 4, "/movies", true);
  assert.deepEqual(p, {
    tmdbId: 9, title: "Dune", titleSlug: "dune-9", year: 2021, images: [],
    monitored: true, qualityProfileId: 4, rootFolderPath: "/movies",
    addOptions: { searchForMovie: true },
  });
});

test("payload de serie Sonarr v3 con monitor", () => {
  const p = seriesAddPayload(
    { tvdbId: 5, title: "Dark", titleSlug: "dark-5" }, 2, "/tv", "future", false);
  assert.deepEqual(p, {
    tvdbId: 5, title: "Dark", titleSlug: "dark-5", images: [],
    monitored: true, seasonFolder: true, qualityProfileId: 2, rootFolderPath: "/tv",
    addOptions: { monitor: "future", searchForMissingEpisodes: false },
  });
});
