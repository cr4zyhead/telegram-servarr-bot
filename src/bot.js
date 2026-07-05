import path from "node:path";
import { Bot } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import { loadConfig } from "./config.js";
import { Acl } from "./acl.js";
import { Servarr } from "./api.js";
import { es, en } from "./strings.js";
import { resolveLang } from "./lang.js";
import { libraryLines, upcomingLines, chunk, runOnBoth, queueLines } from "./library.js";
import { movieConversation } from "./movie.js";
import { serieConversation } from "./serie.js";
import { removeConversation } from "./remove.js";
import { registerAdmin } from "./admin.js";

export function createBot(config, acl, radarr, sonarr) {
  const bot = new Bot(config.telegram.botToken);
  const isAdmin = (id) => id === config.bot.owner;

  bot.use((ctx, next) => {
    ctx.t = resolveLang(acl, ctx.from);
    return next();
  });

  // /auth pasa siempre; el resto exige estar en la ACL
  bot.use(async (ctx, next) => {
    const text = ctx.message?.text ?? "";
    if (text.startsWith("/auth")) return next();
    if (!ctx.from || !acl.isAllowed(ctx.from.id)) return ctx.reply(ctx.t.notAuthorized);
    return next();
  });

  bot.use(conversations());
  bot.use(createConversation(movieConversation(radarr, config.bot.maxResults, acl), "movie"));
  if (sonarr)
    bot.use(createConversation(
      serieConversation(sonarr, config.bot.maxResults, acl), "serie"));
  bot.use(createConversation(removeConversation(radarr, sonarr, acl, config.bot.owner), "remove"));

  bot.command("auth", async (ctx) => {
    const password = (ctx.match ?? "").trim();
    if (!password) return ctx.reply(ctx.t.authUsage);
    if (acl.isAllowed(ctx.from.id)) return ctx.reply(ctx.t.authAlready);
    if (acl.isRevoked(ctx.from.id)) return ctx.reply(ctx.t.authRevoked);
    if (password !== config.bot.password) return ctx.reply(ctx.t.authBadPassword);
    acl.allow(ctx.from);
    if (config.bot.owner && config.bot.owner !== ctx.from.id)
      await ctx.api.sendMessage(config.bot.owner, ctx.t.authUserGranted(acl.name(ctx.from)))
        .catch(() => {});
    return ctx.reply(ctx.t.authGranted);
  });

  bot.command(["start", "help"], (ctx) =>
    ctx.reply(ctx.t.help + (isAdmin(ctx.from.id) ? "\n" + ctx.t.helpAdmin : ""),
      { parse_mode: "Markdown" }));

  bot.command("clear", async (ctx) => {
    await ctx.conversation.exitAll();
    return ctx.reply(ctx.t.cleared);
  });

  bot.command("language", (ctx) => {
    const arg = (ctx.match ?? "").trim().toLowerCase();
    if (arg !== "es" && arg !== "en") {
      const current = ctx.t.locale === "es" ? "español" : "English";
      return ctx.reply(ctx.t.langUsage(current));
    }
    acl.setLang(ctx.from.id, arg);
    return ctx.reply((arg === "en" ? en : es).langSet);
  });

  bot.command(["movie", "query", "q"], (ctx) => ctx.conversation.enter("movie"));
  bot.command("serie", (ctx) =>
    sonarr ? ctx.conversation.enter("serie") : ctx.reply(ctx.t.sonarrMissing));
  bot.command("remove", (ctx) => ctx.conversation.enter("remove"));

  bot.command("library", async (ctx) => {
    const lines = await libraryLines(radarr, sonarr, (ctx.match ?? "").trim() || null);
    if (!lines.length) return ctx.reply(ctx.t.libraryEmpty);
    for (const block of chunk(lines)) await ctx.reply(block.join("\n"));
  });

  bot.command("queue", async (ctx) => {
    const lines = await queueLines(radarr, sonarr);
    if (!lines.length) return ctx.reply(ctx.t.queueEmpty);
    for (const block of chunk(lines)) await ctx.reply(block.join("\n"));
  });

  bot.command("upcoming", async (ctx) => {
    const days = Number((ctx.match ?? "").trim()) || 30;
    const lines = await upcomingLines(radarr, sonarr, days, ctx.t.locale);
    if (!lines.length) return ctx.reply(ctx.t.calendarEmpty);
    for (const block of chunk(lines)) await ctx.reply(block.join("\n"));
  });

  const adminCmd = (name, radarrCmd, sonarrCmd) =>
    bot.command(name, async (ctx) => {
      if (!isAdmin(ctx.from.id)) return ctx.reply(ctx.t.adminOnly);
      const sent = await runOnBoth(radarr, sonarr, radarrCmd, sonarrCmd);
      return ctx.reply(ctx.t.commandsSent(sent));
    });
  adminCmd("rss", "RssSync", "RssSync");
  adminCmd("wanted", "MissingMoviesSearch", "MissingEpisodeSearch");
  adminCmd("refresh", "RefreshMovie", "RefreshSeries");

  registerAdmin(bot, acl, isAdmin);

  bot.on("callback_query", (ctx) => ctx.answerCallbackQuery().catch(() => {}));

  bot.catch((err) => {
    console.error("bot error:", err.error ?? err);
    const t = err.ctx?.t ?? es;
    err.ctx?.reply(t.error(err.error?.message ?? "desconocido")).catch(() => {});
  });

  return bot;
}

// arranque solo si se ejecuta directo (node src/bot.js)
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const configDir = process.env.CONFIG_DIR || "config";
  const config = loadConfig(configDir);
  const acl = new Acl(path.join(configDir, "acl.json"));
  const radarr = new Servarr(config.radarr);
  const sonarr = config.sonarr ? new Servarr(config.sonarr) : null;
  const bot = createBot(config, acl, radarr, sonarr);
  if (config.webhook) {
    const { startWebhookServer } = await import("./notify.js");
    startWebhookServer(config, bot, () => resolveLang(acl, { id: config.bot.owner }));
    console.log("Webhook escuchando en puerto", config.webhook.port);
  }
  console.log("Bot iniciando… sonarr:", Boolean(sonarr));
  bot.start();
}
