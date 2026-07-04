import { t } from "./strings.js";
import { pick, yesNo } from "./wizard.js";
import { movieAddPayload } from "./payloads.js";

export function movieConversation(radarr, maxResults) {
  return async function movie(conversation, ctx) {
    const term = (ctx.message?.text ?? "").replace(/^\/\S+\s*/, "").trim();
    if (!term) return void (await ctx.reply(t.movieUsage));

    const found = await conversation.external(() => radarr.get("movie/lookup", { term }));
    if (!found.length) return void (await ctx.reply(t.noResults(term)));

    const movie = await pick(conversation, ctx, found.slice(0, maxResults),
      (m) => `${m.title} (${m.year || "s/f"})`, t.foundN(found.length, "🎬"));
    if (!movie) return;

    const library = await conversation.external(() => radarr.get("movie"));
    if (library.some((m) => m.tmdbId === movie.tmdbId))
      return void (await ctx.reply(t.alreadyAdded(movie.title)));

    if (movie.overview)
      await ctx.reply(`${movie.title} (${movie.year})\n\n${movie.overview}`.slice(0, 4000));

    const profiles = await conversation.external(() => radarr.get("qualityprofile"));
    const profile = await pick(conversation, ctx, profiles, (p) => p.name, t.pickProfile);
    if (!profile) return;

    const folders = await conversation.external(() => radarr.get("rootfolder"));
    const folder = folders.length === 1
      ? folders[0]
      : await pick(conversation, ctx, folders, (f) => f.path, t.pickFolder);
    if (!folder) return;

    const search = await yesNo(conversation, ctx, t.searchNow);
    if (search === null) return;

    await conversation.external(() =>
      radarr.post("movie", movieAddPayload(movie, profile.id, folder.path, search)));
    await ctx.reply(t.added("🎬", movie.title));
  };
}
