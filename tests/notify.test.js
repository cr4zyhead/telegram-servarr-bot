import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { formatEvent, compressEpisodes, createAggregator } from "../src/notify.js";
import { es } from "../src/strings.js";

test("Download de película sigue inmediato", () => {
  const msg = formatEvent({ eventType: "Download", movie: { title: "Dune", year: 2021 } }, es);
  assert.equal(msg, "🎬 ✅ Dune (2021) ya está disponible");
});

test("series y otros eventos → null (van al agregador)", () => {
  assert.equal(formatEvent({ eventType: "Download", series: { title: "Dark" }, episodes: [] }, es), null);
  assert.equal(formatEvent({ eventType: "Test" }, es), null);
});

test("compressEpisodes ordena, deduplica y comprime rangos por temporada", () => {
  assert.equal(compressEpisodes([
    { seasonNumber: 2, episodeNumber: 3 },
    { seasonNumber: 2, episodeNumber: 1 },
    { seasonNumber: 2, episodeNumber: 2 },
    { seasonNumber: 2, episodeNumber: 2 },
    { seasonNumber: 2, episodeNumber: 5 },
    { seasonNumber: 3, episodeNumber: 1 },
  ]), "2x01–2x03, 2x05, 3x01");
  assert.equal(compressEpisodes([{ seasonNumber: 1, episodeNumber: 7 }]), "1x07");
  // 1x10 y 2x01 no forman rango aunque sean "consecutivos" cronológicamente
  assert.equal(compressEpisodes([
    { seasonNumber: 1, episodeNumber: 10 }, { seasonNumber: 2, episodeNumber: 1 },
  ]), "1x10, 2x01");
});

test("agregador: N eventos → 1 send con todo; series distintas no se mezclan", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const send = mock.fn();
  const add = createAggregator(send, 1000);
  add("Friends", [{ seasonNumber: 2, episodeNumber: 1 }]);
  t.mock.timers.tick(500);
  // Friends: add en t=500 reinicia su timer → vence en t=1500 (no en t=1000)
  add("Friends", [{ seasonNumber: 2, episodeNumber: 2 }]);
  // Dark: add en t=500 → vence también en t=1500
  add("Dark", [{ seasonNumber: 1, episodeNumber: 1 }]);
  t.mock.timers.tick(999);
  // t=1499: ni Friends ni Dark vencieron todavía
  assert.equal(send.mock.callCount(), 0);
  t.mock.timers.tick(1);
  // t=1500: ambos vencen en el mismo tick (mismo instante)
  assert.equal(send.mock.callCount(), 2);
  t.mock.timers.tick(500);
  // nada nuevo pendiente: sigue en 2
  assert.equal(send.mock.callCount(), 2);
  const calls = send.mock.calls.map((c) => c.arguments);
  const friends = calls.find(([title]) => title === "Friends");
  const dark = calls.find(([title]) => title === "Dark");
  assert.deepEqual(friends[1], [{ seasonNumber: 2, episodeNumber: 1 }, { seasonNumber: 2, episodeNumber: 2 }]);
  assert.deepEqual(dark[1], [{ seasonNumber: 1, episodeNumber: 1 }]);
  assert.equal(calls.length, 2);
});

test("agregador: add con episodios vacíos no dispara send", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const send = mock.fn();
  const add = createAggregator(send, 1000);
  add("Dark", []);
  t.mock.timers.tick(1000);
  assert.equal(send.mock.callCount(), 0);
});

test("integración: eventos de serie terminan en UN sendMessage agregado", async (t) => {
  const { startWebhookServer } = await import("../src/notify.js");
  const sent = [];
  const bot = { api: { sendMessage: async (id, text) => { sent.push(text); } } };
  const config = { bot: { owner: 1 }, webhook: { token: "tk", port: 0, debounceMs: 30 } };
  const server = startWebhookServer(config, bot, () => es);
  t.after(() => server.close());
  await new Promise((r) => server.once("listening", r));
  const port = server.address().port;
  const post = (body) => fetch(`http://127.0.0.1:${port}/webhook?token=tk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const r1 = await post({ eventType: "Download", series: { title: "Dark" }, episodes: [{ seasonNumber: 1, episodeNumber: 1 }] });
  assert.equal(r1.status, 200);
  await post({ eventType: "Download", series: { title: "Dark" }, episodes: [{ seasonNumber: 1, episodeNumber: 2 }] });
  await new Promise((r) => setTimeout(r, 150));
  assert.deepEqual(sent, [es.notifEpisodes("Dark", 2, "1x01–1x02")]);
});
