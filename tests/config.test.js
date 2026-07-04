import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../src/config.js";

function writeConfig(obj) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cfg-"));
  fs.writeFileSync(path.join(dir, "config.json"), JSON.stringify(obj));
  return dir;
}

test("aplica defaults y conserva valores", () => {
  const dir = writeConfig({
    telegram: { botToken: "tok" },
    bot: { password: "p", owner: 42 },
    radarr: { hostname: "1.2.3.4", apiKey: "k", port: 7878 },
  });
  const c = loadConfig(dir);
  assert.equal(c.bot.maxResults, 10);
  assert.equal(c.radarr.hostname, "1.2.3.4");
  assert.equal(c.sonarr, undefined);
});

test("sonarr sin apiKey se descarta", () => {
  const dir = writeConfig({
    telegram: { botToken: "tok" }, bot: {},
    radarr: { hostname: "h", apiKey: "k", port: 1 },
    sonarr: { hostname: "h2", port: 2 },
  });
  assert.equal(loadConfig(dir).sonarr, undefined);
});

test("falla sin botToken", () => {
  const dir = writeConfig({ bot: {}, radarr: {} });
  assert.throws(() => loadConfig(dir), /botToken/);
});
