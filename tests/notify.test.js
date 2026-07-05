import { test } from "node:test";
import assert from "node:assert/strict";
import { formatEvent } from "../src/notify.js";
import { es } from "../src/strings.js";

test("Download de película", () => {
  const msg = formatEvent({ eventType: "Download", movie: { title: "Dune", year: 2021 } }, es);
  assert.equal(msg, "🎬 ✅ Dune (2021) ya está disponible");
});

test("Download de episodios", () => {
  const msg = formatEvent({
    eventType: "Download",
    series: { title: "Dark" },
    episodes: [{ seasonNumber: 2, episodeNumber: 3 }, { seasonNumber: 2, episodeNumber: 4 }],
  }, es);
  assert.equal(msg, "📺 ✅ Dark 2x03, 2x04 ya está disponible");
});

test("otros eventos y payloads raros → null", () => {
  assert.equal(formatEvent({ eventType: "Test" }, es), null);
  assert.equal(formatEvent({ eventType: "Grab", movie: { title: "X" } }, es), null);
  assert.equal(formatEvent({ eventType: "Download" }, es), null);
});
