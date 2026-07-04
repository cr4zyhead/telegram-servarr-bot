import { t } from "./strings.js";
import { pick, yesNo } from "./wizard.js";
import { seriesAddPayload } from "./payloads.js";

const MONITOR_OPTIONS = [
  { label: "Todas las temporadas", value: "all" },
  { label: "Solo temporadas futuras", value: "future" },
  { label: "Primera temporada", value: "firstSeason" },
  { label: "Última temporada", value: "lastSeason" },
];

export function serieConversation(sonarr, maxResults) {
  return async function serie(conversation, ctx) {
    const term = (ctx.message?.text ?? "").replace(/^\/\S+\s*/, "").trim();
    if (!term) return void (await ctx.reply(t.serieUsage));

    const found = await conversation.external(() => sonarr.get("series/lookup", { term }));
    if (!found.length) return void (await ctx.reply(t.noResults(term)));

    const serie = await pick(conversation, ctx, found.slice(0, maxResults),
      (s) => `${s.title} (${s.year || "s/f"})`, t.foundN(found.length, "📺"));
    if (!serie) return;

    const library = await conversation.external(() => sonarr.get("series"));
    if (library.some((s) => s.tvdbId === serie.tvdbId))
      return void (await ctx.reply(t.alreadyAdded(serie.title)));

    if (serie.overview)
      await ctx.reply(`${serie.title} (${serie.year})\n\n${serie.overview}`.slice(0, 4000));

    const profiles = await conversation.external(() => sonarr.get("qualityprofile"));
    const profile = await pick(conversation, ctx, profiles, (p) => p.name, t.pickProfile);
    if (!profile) return;

    const folders = await conversation.external(() => sonarr.get("rootfolder"));
    const folder = folders.length === 1
      ? folders[0]
      : await pick(conversation, ctx, folders, (f) => f.path, t.pickFolder);
    if (!folder) return;

    const monitor = await pick(conversation, ctx, MONITOR_OPTIONS, (o) => o.label, t.pickMonitor);
    if (!monitor) return;

    const search = await yesNo(conversation, ctx, t.searchNow);
    if (search === null) return;

    await conversation.external(() =>
      sonarr.post("series", seriesAddPayload(serie, profile.id, folder.path, monitor.value, search)));
    await ctx.reply(t.added("📺", serie.title));
  };
}
