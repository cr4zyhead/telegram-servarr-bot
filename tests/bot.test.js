import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createBot } from "../src/bot.js";
import { Acl } from "../src/acl.js";
import { Servarr } from "../src/api.js";

test("createBot construye sin tocar la red", () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "b-")), "acl.json");
  fs.writeFileSync(file, '{"allowedUsers":[],"revokedUsers":[]}');
  const config = {
    telegram: { botToken: "123:fake" },
    bot: { password: "p", owner: 1, maxResults: 10 },
  };
  const radarr = new Servarr({ hostname: "h", port: 1, apiKey: "k" });
  const bot = createBot(config, new Acl(file), radarr, null);
  assert.ok(bot);
  assert.equal(bot.token, "123:fake");
});
