import { titleFor, tmdbImageUrl, yearFrom } from "../domain/overlap.js";

export function SearchResults({
  results,
  mediaType,
  searchCompleted,
  searching,
  onSelect,
}) {
  if (searching || !searchCompleted) return null;

  if (!results.length) {
    return (
      <section className="mb-8 rounded-xl bg-slate-800/40 p-4 text-slate-300">
        Ingen titler matchede søgningen.
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-semibold">Vælg titel</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {results.map((item) => {
          const title = titleFor(item, mediaType);
          const poster = tmdbImageUrl(item.poster_path, "w92");

          return (
            <button
              key={`${mediaType}-${item.id}`}
              type="button"
              onClick={() => onSelect(item)}
              className="rounded-2xl bg-slate-800/60 p-3 text-left ring-1 ring-slate-700 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              <div className="flex items-center gap-3">
                <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-slate-700">
                  {poster && (
                    <img
                      src={poster}
                      alt={`Plakat for ${title}`}
                      width="92"
                      height="138"
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <div className="font-medium">{title}</div>
                  <div className="text-xs text-slate-400">
                    {yearFrom(item, mediaType)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
