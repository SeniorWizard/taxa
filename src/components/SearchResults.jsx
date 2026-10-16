import { titleFor, tmdbImageUrl, yearFrom } from "../domain/overlap.js";
import { Spinner } from "./ui.jsx";

export function SearchResults({
  sectionRef,
  results,
  mediaType,
  searchCompleted,
  searching,
  onSelect,
  searchNotice,
  onTryOtherType,
  smartSearchOptions = [],
  onSmartSearch,
}) {
  if (searching) {
    return (
      <section ref={sectionRef} tabIndex={-1} className="mb-8 rounded-3xl bg-slate-800/40 p-5 outline-none">
        <Spinner label="Finder titler…" />
      </section>
    );
  }

  if (!searchCompleted) return null;

  if (!results.length) {
    return (
      <section
        ref={sectionRef}
        tabIndex={-1}
        className="mb-8 rounded-2xl bg-slate-800/40 p-5 text-slate-300 outline-none"
      >
        <p>{searchNotice || "Ingen titler matchede søgningen."}</p>

        {smartSearchOptions.length > 0 && onSmartSearch && (
          <div className="mt-4 rounded-2xl bg-slate-900/50 p-3 ring-1 ring-slate-700">
            <p className="mb-2 text-xs leading-5 text-slate-400">
              Du har valgt en begrænset søgning. Du kan udvide den et trin uden at ændre dine indstillinger.
            </p>
            <div className="flex flex-wrap gap-2">
              {smartSearchOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onSmartSearch(option)}
                  className="rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-200 ring-1 ring-slate-700 hover:ring-yellow-400/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Voksenfilteret ændres aldrig automatisk.
            </p>
          </div>
        )}

        {onTryOtherType && (
          <button
            type="button"
            onClick={onTryOtherType}
            className="mt-3 rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-200 ring-1 ring-slate-700 hover:ring-yellow-400/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
          >
            Prøv som {mediaType === "tv" ? "film" : "TV-serie"}
          </button>
        )}
      </section>
    );
  }

  const notice = searchNotice ? (
    <p className="mb-3 rounded-2xl bg-yellow-400/5 px-4 py-3 text-sm text-yellow-100 ring-1 ring-yellow-400/20">
      {searchNotice}
    </p>
  ) : null;

  return (
    <section ref={sectionRef} tabIndex={-1} className="mb-8 outline-none">
      {notice}
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">Vælg titel</h2>
        <span className="text-xs text-slate-500">{results.length} resultater</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {results.map((item) => {
          const title = titleFor(item, mediaType);
          const poster = tmdbImageUrl(item.poster_path, "w92");

          return (
            <button
              key={`${mediaType}-${item.id}`}
              type="button"
              onClick={() => onSelect(item)}
              className="rounded-2xl bg-slate-800/60 p-3 text-left ring-1 ring-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-800 hover:ring-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
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
                <div className="min-w-0">
                  <div className="truncate font-medium">{title}</div>
                  <div className="mt-0.5 text-xs text-slate-400">
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
