import { test } from "node:test";
import assert from "node:assert/strict";
import { libraryLines, upcomingLines, chunk, runOnBoth } from "../src/library.js";

const fake = (routes) => ({
  get: async (p) => routes[p] ?? [],
  post: async (p, body) => { (routes.posted ??= []).push(body.name); return {}; },
});

test("libraryLines combina, filtra y ordena", async () => {
  const radarr = fake({ movie: [{ title: "Zulu", year: 2013 }, { title: "Dune", year: 2021 }] });
  const sonarr = fake({ series: [{ title: "Dark", year: 2017 }] });
  const all = await libraryLines(radarr, sonarr, null);
  assert.deepEqual(all, ["📺 Dark (2017)", "🎬 Dune (2021)", "🎬 Zulu (2013)"]);
  const filtered = await libraryLines(radarr, sonarr, "du");
  assert.deepEqual(filtered, ["🎬 Dune (2021)"]);
});

test("libraryLines sin sonarr solo trae películas", async () => {
  const radarr = fake({ movie: [{ title: "Dune", year: 2021 }] });
  assert.deepEqual(await libraryLines(radarr, null, null), ["🎬 Dune (2021)"]);
});

test("upcomingLines ordena por fecha y marca descargados", async () => {
  const radarr = fake({ calendar: [{ title: "Peli", digitalRelease: "2026-07-20", hasFile: false }] });
  const sonarr = fake({ calendar: [{ airDateUtc: "2026-07-10T02:00:00Z", seasonNumber: 2, episodeNumber: 3, hasFile: true, series: { title: "Dark" } }] });
  const lines = await upcomingLines(radarr, sonarr, 30);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /Dark 2x03 ✅/);
  assert.match(lines[1], /Peli/);
});

test("chunk parte en bloques de 50", () => {
  const out = chunk(Array.from({ length: 120 }, (_, i) => String(i)));
  assert.deepEqual(out.map((c) => c.length), [50, 50, 20]);
});

test("runOnBoth dispara en ambos y reporta", async () => {
  const r = fake({}), s = fake({});
  const out = await runOnBoth(r, s, "RssSync", "RssSync");
  assert.deepEqual(out, ["🎬 RssSync", "📺 RssSync"]);
  const out2 = await runOnBoth(r, null, "RefreshMovie", "RefreshSeries");
  assert.deepEqual(out2, ["🎬 RefreshMovie"]);
});

test("filtro con regex inválida cae a búsqueda literal", async () => {
  const radarr = fake({ movie: [{ title: "Dune (2021", year: 2021 }, { title: "Zulu", year: 2013 }] });
  const lines = await libraryLines(radarr, null, "dune (");
  assert.deepEqual(lines, ["🎬 Dune (2021 (2021)"]);
});

test("runOnBoth reporta fallo parcial sin perder el éxito previo", async () => {
  const r = fake({});
  const s = { get: async () => [], post: async () => { throw new Error("boom"); } };
  const out = await runOnBoth(r, s, "RssSync", "RssSync");
  assert.equal(out[0], "🎬 RssSync");
  assert.match(out[1], /^📺 RssSync ⚠️ boom/);
});
