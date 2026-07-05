import { resolveLang } from "./lang.js";
import { pick, yesNo } from "./wizard.js";

export function removeConversation(radarr, sonarr, acl, ownerId) {
  return async function remove(conversation, ctx) {
    const t = resolveLang(acl, ctx.from);
    if (ctx.from.id !== ownerId) return void (await ctx.reply(t.adminOnly));
    const term = (ctx.message?.text ?? "").replace(/^\/\S+\s*/, "").trim().toLowerCase();
    if (!term) return void (await ctx.reply(t.removeUsage));

    const [movies, series] = await conversation.external(() =>
      Promise.all([radarr.get("movie"), sonarr ? sonarr.get("series") : []]));
    const matches = [
      ...movies.filter((m) => m.title.toLowerCase().includes(term))
        .map((m) => ({ icon: "🎬", kind: "movie", item: m })),
      ...series.filter((s) => s.title.toLowerCase().includes(term))
        .map((s) => ({ icon: "📺", kind: "series", item: s })),
    ].slice(0, 20);
    if (!matches.length) return void (await ctx.reply(t.noResults(term)));

    const chosen = await pick(conversation, ctx, t, matches,
      (x) => `${x.icon} ${x.item.title}${x.item.year ? ` (${x.item.year})` : ""}`, t.removeWho);
    if (!chosen) return;

    const sure = await yesNo(conversation, ctx, t, t.removeConfirm(chosen.item.title));
    if (sure !== true) return void (sure === false && (await ctx.reply(t.cleared)));

    const files = await yesNo(conversation, ctx, t, t.removeFiles);
    if (files === null) return;

    const api = chosen.kind === "movie" ? radarr : sonarr;
    await conversation.external(() =>
      api.del(`${chosen.kind}/${chosen.item.id}`, { deleteFiles: String(files) }));
    await ctx.reply(t.removed(chosen.item.title));
  };
}
