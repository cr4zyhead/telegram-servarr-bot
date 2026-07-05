import http from "node:http";

export function formatEvent(payload, t) {
  if (payload.eventType !== "Download") return null;
  if (payload.movie) {
    const m = payload.movie;
    return t.notifAvailable("🎬", m.title + (m.year ? ` (${m.year})` : ""));
  }
  if (payload.series) {
    const eps = (payload.episodes ?? [])
      .map((e) => `${e.seasonNumber}x${String(e.episodeNumber).padStart(2, "0")}`)
      .join(", ");
    return t.notifAvailable("📺", `${payload.series.title} ${eps}`.trim());
  }
  return null;
}

// ponytail: sin límite de body ni rate limit — tráfico LAN de dos servicios conocidos
export function startWebhookServer(config, bot, getT) {
  const chatId = config.bot.notifyId || config.bot.owner;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.searchParams.get("token") !== config.webhook.token) {
      req.resume();
      return res.writeHead(403).end();
    }
    if (req.method !== "POST") {
      req.resume();
      return res.writeHead(405).end();
    }
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", async () => {
      res.writeHead(200).end("ok");
      try {
        const text = formatEvent(JSON.parse(body), getT());
        if (text) await bot.api.sendMessage(chatId, text);
      } catch (err) {
        console.error("webhook:", err.message);
      }
    });
  });
  server.listen(config.webhook.port);
  return server;
}
