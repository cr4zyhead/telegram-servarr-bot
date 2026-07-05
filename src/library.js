const fmtDate = (d, locale) =>
  new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short" });

export async function libraryLines(radarr, sonarr, filter) {
  const [movies, series] = await Promise.all([
    radarr.get("movie"),
    sonarr ? sonarr.get("series") : [],
  ]);
  let rx = null;
  if (filter) {
    try {
      rx = new RegExp(filter, "i");
    } catch {
      rx = new RegExp(filter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }
  }
  const line = (icon, x) => `${icon} ${x.title}${x.year ? ` (${x.year})` : ""}`;
  return [
    ...movies.map((m) => line("🎬", m)),
    ...series.map((s) => line("📺", s)),
  ]
    .filter((l) => !rx || rx.test(l))
    .sort((a, b) => a.slice(2).localeCompare(b.slice(2), "es"));
}

export async function upcomingLines(radarr, sonarr, days, locale = "es") {
  const start = new Date().toISOString();
  const end = new Date(Date.now() + days * 86400e3).toISOString();
  const [movies, episodes] = await Promise.all([
    radarr.get("calendar", { start, end }),
    sonarr ? sonarr.get("calendar", { start, end, includeSeries: "true" }) : [],
  ]);
  const events = [
    ...movies.map((m) => ({
      date: m.digitalRelease || m.physicalRelease || m.inCinemas,
      label: `🎬 ${m.title}${m.hasFile ? " ✅" : ""}`,
    })),
    ...episodes.map((e) => ({
      date: e.airDateUtc,
      label: `📺 ${e.series?.title ?? "?"} ${e.seasonNumber}x${String(e.episodeNumber).padStart(2, "0")}${e.hasFile ? " ✅" : ""}`,
    })),
  ]
    .filter((e) => e.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return events.map((e) => `${fmtDate(e.date, locale)} — ${e.label}`);
}

export function chunk(lines, size = 50) {
  const out = [];
  for (let i = 0; i < lines.length; i += size) out.push(lines.slice(i, i + size));
  return out;
}

export async function runOnBoth(radarr, sonarr, radarrCmd, sonarrCmd) {
  const out = [];
  const run = async (icon, api, name) => {
    try {
      await api.post("command", { name });
      out.push(`${icon} ${name}`);
    } catch (err) {
      out.push(`${icon} ${name} ⚠️ ${err.message}`.slice(0, 200));
    }
  };
  await run("🎬", radarr, radarrCmd);
  if (sonarr) await run("📺", sonarr, sonarrCmd);
  return out;
}

export async function queueLines(radarr, sonarr) {
  const [rq, sq] = await Promise.all([
    radarr.get("queue", { pageSize: "50", includeMovie: "true" }),
    sonarr ? sonarr.get("queue", { pageSize: "50", includeSeries: "true", includeEpisode: "true" }) : { records: [] },
  ]);
  const pct = (r) => (r.size ? Math.round(((r.size - r.sizeleft) / r.size) * 100) : 0);
  const line = (icon, name, r) =>
    `${icon} ${name} — ${pct(r)}%${r.timeleft ? ` (${r.timeleft})` : ""} · ${r.status}`;
  return [
    ...(rq.records ?? []).map((r) => line("🎬", r.movie?.title ?? r.title ?? "?", r)),
    ...(sq.records ?? []).map((r) => line("📺",
      `${r.series?.title ?? "?"}${r.episode ? ` ${r.episode.seasonNumber}x${String(r.episode.episodeNumber).padStart(2, "0")}` : ""}`, r)),
  ];
}
