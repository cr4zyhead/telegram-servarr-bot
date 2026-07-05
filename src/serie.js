import { resolveLang } from "./lang.js";
import { pick, yesNo, carousel } from "./wizard.js";
import { seriesAddPayload } from "./payloads.js";

export function serieConversation(sonarr, maxResults, acl) {
  return async function serie(conversation, ctx) {
    const t = resolveLang(acl, ctx.from);
    const MONITOR_OPTIONS = [
      { label: t.monitorAll, value: "all" },
      { label: t.monitorFuture, value: "future" },
      { label: t.monitorFirst, value: "firstSeason" },
      { label: t.monitorLast, value: "lastSeason" },
    ];

    const term = (ctx.message?.text ?? "").replace(/^\/\S+\s*/, "").trim();
    if (!term) return void (await ctx.reply(t.serieUsage));

    const found = await conversation.external(() => sonarr.get("series/lookup", { term }));
    if (!found.length) return void (await ctx.reply(t.noResults(term)));

    const serie = await carousel(conversation, ctx, t, found.slice(0, maxResults));
    if (!serie) return;

    const library = await conversation.external(() => sonarr.get("series"));
    if (library.some((s) => s.tvdbId === serie.tvdbId))
      return void (await ctx.reply(t.alreadyAdded(serie.title)));

    const profiles = await conversation.external(() => sonarr.get("qualityprofile"));
    const profile = await pick(conversation, ctx, t, profiles, (p) => p.name, t.pickProfile);
    if (!profile) return;

    const folders = await conversation.external(() => sonarr.get("rootfolder"));
    const folder = folders.length === 1
      ? folders[0]
      : await pick(conversation, ctx, t, folders, (f) => f.path, t.pickFolder);
    if (!folder) return;

    const monitor = await pick(conversation, ctx, t, MONITOR_OPTIONS,
      (o) => o.label, t.pickMonitor);
    if (!monitor) return;

    const search = await yesNo(conversation, ctx, t, t.searchNow);
    if (search === null) return;

    await conversation.external(() =>
      sonarr.post("series", seriesAddPayload(serie, profile.id, folder.path, monitor.value, search)));
    await ctx.reply(t.added("📺", serie.title));
  };
}
