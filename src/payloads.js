export function movieAddPayload(movie, profileId, folderPath, search) {
  return {
    tmdbId: movie.tmdbId,
    title: movie.title,
    titleSlug: movie.titleSlug,
    year: movie.year,
    images: [],
    monitored: true,
    qualityProfileId: profileId,
    rootFolderPath: folderPath,
    addOptions: { searchForMovie: search },
  };
}

export function seriesAddPayload(series, profileId, folderPath, monitor, search) {
  return {
    tvdbId: series.tvdbId,
    title: series.title,
    titleSlug: series.titleSlug,
    images: [],
    monitored: true,
    seasonFolder: true,
    qualityProfileId: profileId,
    rootFolderPath: folderPath,
    addOptions: { monitor, searchForMissingEpisodes: search },
  };
}
