import http from "node:http";

export function formatEvent(payload, t) {
  if (payload.eventType !== "Download") return null;
  if (payload.movie) {
    const m = payload.movie;
    return t.notifAvailable("🎬", m.title + (m.year ? ` (${m.year})` : ""));
  }
  return null;
}

const fmtEp = (e) => `${e.seasonNumber}x${String(e.episodeNumber).padStart(2, "0")}`;

export function compressEpisodes(eps) {
  const uniq = [...new Map(eps.map((e) => [fmtEp(e), e])).values()]
    .sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber);
  const parts = [];
  let start = 0;
  for (let i = 1; i <= uniq.length; i++) {
    const prev = uniq[i - 1];
    const cur = uniq[i];
    if (cur && cur.seasonNumber === prev.seasonNumber && cur.episodeNumber === prev.episodeNumber + 1) continue;
    parts.push(start === i - 1 ? fmtEp(uniq[start]) : `${fmtEp(uniq[start])}–${fmtEp(prev)}`);
    start = i;
  }
  return parts.join(", ");
}

// ponytail: pendientes en memoria; un reinicio durante la ventana pierde esa alerta.
// El array de episodios crece sin tope dentro de la ventana — tráfico LAN de confianza.
export function createAggregator(send, debounceMs = 120000) {
  const pending = new Map();
  return function add(title, episodes) {
    const entry = pending.get(title) ?? { episodes: [] };
    entry.episodes.push(...episodes);
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      pending.delete(title);
      if (entry.episodes.length === 0) return;
      Promise.resolve(send(title, entry.episodes)).catch((err) => console.error("webhook:", err.message));
    }, debounceMs);
    pending.set(title, entry);
  };
}

// ponytail: sin límite de body ni rate limit — tráfico LAN de dos servicios conocidos
export function startWebhookServer(config, bot, getT) {
  const chatId = config.bot.notifyId || config.bot.owner;
  const aggregator = createAggregator(async (title, episodes) => {
    const t = getT();
    await bot.api.sendMessage(chatId,
      t.notifEpisodes(title, new Set(episodes.map((e) => `${e.seasonNumber}x${e.episodeNumber}`)).size, compressEpisodes(episodes)));
    console.log("notificación enviada:", title, `(${episodes.length} eventos)`);
  }, config.webhook.debounceMs ?? 120000);
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
    req.setEncoding("utf8");
    req.on("data", (c) => { body += c; });
    req.on("end", async () => {
      res.writeHead(200).end("ok");
      try {
        const payload = JSON.parse(body);
        if (payload.eventType === "Download" && payload.series) {
          aggregator(payload.series.title, payload.episodes ?? []);
          return;
        }
        const text = formatEvent(payload, getT());
        if (text) {
          await bot.api.sendMessage(chatId, text);
          console.log("notificación enviada:", text.slice(0, 60));
        }
      } catch (err) {
        console.error("webhook:", err.message);
      }
    });
  });
  server.listen(config.webhook.port);
  return server;
}
