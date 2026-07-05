import { resolveLang } from "./lang.js";
import { pick, yesNo, carousel } from "./wizard.js";
import { movieAddPayload } from "./payloads.js";

export function movieConversation(radarr, maxResults, acl) {
  return async function movie(conversation, ctx) {
    const t = resolveLang(acl, ctx.from);
    const term = (ctx.message?.text ?? "").replace(/^\/\S+\s*/, "").trim();
    if (!term) return void (await ctx.reply(t.movieUsage));

    const found = await conversation.external(() => radarr.get("movie/lookup", { term }));
    if (!found.length) return void (await ctx.reply(t.noResults(term)));

    const movie = await carousel(conversation, ctx, t, found.slice(0, maxResults));
    if (!movie) return;

    const library = await conversation.external(() => radarr.get("movie"));
    if (library.some((m) => m.tmdbId === movie.tmdbId))
      return void (await ctx.reply(t.alreadyAdded(movie.title)));

    const profiles = await conversation.external(() => radarr.get("qualityprofile"));
    const profile = await pick(conversation, ctx, t, profiles, (p) => p.name, t.pickProfile);
    if (!profile) return;

    const folders = await conversation.external(() => radarr.get("rootfolder"));
    const folder = folders.length === 1
      ? folders[0]
      : await pick(conversation, ctx, t, folders, (f) => f.path, t.pickFolder);
    if (!folder) return;

    const search = await yesNo(conversation, ctx, t, t.searchNow);
    if (search === null) return;

    await conversation.external(() =>
      radarr.post("movie", movieAddPayload(movie, profile.id, folder.path, search)));
    await ctx.reply(t.added("🎬", movie.title));
  };
}
