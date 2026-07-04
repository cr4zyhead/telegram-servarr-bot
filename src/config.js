import fs from "node:fs";
import path from "node:path";

export function loadConfig(dir = process.env.CONFIG_DIR || "config") {
  const c = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
  if (!c.telegram?.botToken) throw new Error("config: falta telegram.botToken");
  c.bot = { maxResults: 10, owner: 0, password: "", ...c.bot };
  if (!c.sonarr?.apiKey) delete c.sonarr;
  return c;
}
