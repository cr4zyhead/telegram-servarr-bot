import path from "node:path";
import { Bot } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import { loadConfig } from "./config.js";
import { Acl } from "./acl.js";
import { Servarr } from "./api.js";
import { t } from "./strings.js";
import { libraryLines, upcomingLines, chunk, runOnBoth } from "./library.js";
import { movieConversation } from "./movie.js";
import { serieConversation } from "./serie.js";
import { registerAdmin } from "./admin.js";

export function createBot(config, acl, radarr, sonarr) {
  const bot = new Bot(config.telegram.botToken);
  const isAdmin = (id) => id === config.bot.owner;

  // /auth pasa siempre; el resto exige estar en la ACL
  bot.use(async (ctx, next) => {
    const text = ctx.message?.text ?? "";
    if (text.startsWith("/auth")) return next();
    if (!ctx.from || !acl.isAllowed(ctx.from.id)) return ctx.reply(t.notAuthorized);
    return next();
  });

  bot.use(conversations());
  bot.use(createConversation(movieConversation(radarr, config.bot.maxResults), "movie"));
  if (sonarr)
    bot.use(createConversation(serieConversation(sonarr, config.bot.maxResults), "serie"));

  bot.command("auth", async (ctx) => {
    const password = (ctx.match ?? "").trim();
    if (!password) return ctx.reply(t.authUsage);
    if (acl.isAllowed(ctx.from.id)) return ctx.reply(t.authAlready);
    if (acl.isRevoked(ctx.from.id)) return ctx.reply(t.authRevoked);
    if (password !== config.bot.password) return ctx.reply(t.authBadPassword);
    acl.allow(ctx.from);
    if (config.bot.owner && config.bot.owner !== ctx.from.id)
      await ctx.api.sendMessage(config.bot.owner, t.authUserGranted(acl.name(ctx.from)))
        .catch(() => {});
    return ctx.reply(t.authGranted);
  });

  bot.command(["start", "help"], (ctx) =>
    ctx.reply(t.help + (isAdmin(ctx.from.id) ? "\n" + t.helpAdmin : ""),
      { parse_mode: "Markdown" }));

  bot.command("clear", async (ctx) => {
    await ctx.conversation.exitAll();
    return ctx.reply(t.cleared);
  });

  bot.command(["movie", "query", "q"], (ctx) => ctx.conversation.enter("movie"));
  bot.command("serie", (ctx) =>
    sonarr ? ctx.conversation.enter("serie") : ctx.reply(t.sonarrMissing));

  bot.command("library", async (ctx) => {
    const lines = await libraryLines(radarr, sonarr, (ctx.match ?? "").trim() || null);
    if (!lines.length) return ctx.reply(t.libraryEmpty);
    for (const block of chunk(lines)) await ctx.reply(block.join("\n"));
  });

  bot.command("upcoming", async (ctx) => {
    const days = Number((ctx.match ?? "").trim()) || 30;
    const lines = await upcomingLines(radarr, sonarr, days);
    if (!lines.length) return ctx.reply(t.calendarEmpty);
    for (const block of chunk(lines)) await ctx.reply(block.join("\n"));
  });

  const adminCmd = (name, radarrCmd, sonarrCmd) =>
    bot.command(name, async (ctx) => {
      if (!isAdmin(ctx.from.id)) return ctx.reply(t.adminOnly);
      const sent = await runOnBoth(radarr, sonarr, radarrCmd, sonarrCmd);
      return ctx.reply(t.commandsSent(sent));
    });
  adminCmd("rss", "RssSync", "RssSync");
  adminCmd("wanted", "MissingMoviesSearch", "MissingEpisodeSearch");
  adminCmd("refresh", "RefreshMovie", "RefreshSeries");

  registerAdmin(bot, acl, isAdmin);

  bot.catch((err) => {
    console.error("bot error:", err.error ?? err);
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
  console.log("Bot iniciando… sonarr:", Boolean(sonarr));
  bot.start();
}
