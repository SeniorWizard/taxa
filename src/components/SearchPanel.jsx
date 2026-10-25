import { Field, Label } from "./ui.jsx";
import {
  FilmIcon,
  SearchIcon,
  StatusGlyph,
  TvIcon,
} from "./icons.jsx";

function SearchStatusBar({ items }) {
  return (
    <div
      className="mb-5 flex flex-wrap items-center gap-2"
      aria-label="Aktive søgeindstillinger"
    >
      {items.map((item) => (
        <span
          key={item.key}
          title={item.title}
          className={`search-status-icon ${item.active ? "is-active" : "is-inactive"}`}
          aria-label={`${item.label}: ${item.active ? "til" : "fra"}. ${item.title}`}
        >
          <StatusGlyph
            kind={item.icon}
            language={item.language}
            className="h-5 w-5"
          />
        </span>
      ))}
    </div>
  );
}

export function SearchPanel({
  mediaType,
  onMediaTypeChange,
  query,
  onQueryChange,
  onSearch,
  searching,
  connectionReady,
  statusItems,
}) {
  function submit(event) {
    event.preventDefault();
    onSearch();
  }

  return (
    <form onSubmit={submit} className="mb-6 rounded-3xl bg-slate-800/60 p-5 shadow md:p-6">
      <SearchStatusBar items={statusItems} />

      <div className="mb-5 grid grid-cols-2 gap-2" role="group" aria-label="Medietype">
        {["tv", "movie"].map((type) => {
          const selected = mediaType === type;
          return (
            <button
              key={type}
              type="button"
              aria-pressed={selected}
              onClick={() => onMediaTypeChange(type)}
              className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300 ${
                selected
                  ? "bg-yellow-400 text-slate-950 ring-yellow-300"
                  : "bg-slate-900/60 text-slate-300 ring-slate-700 hover:ring-slate-500"
              }`}
            >
              {type === "tv" ? <TvIcon /> : <FilmIcon />}
              {type === "tv" ? "TV-serie" : "Film"}
            </button>
          );
        })}
      </div>

      <Field className="mb-0">
        <Label htmlFor="title-search">Søg titel</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              id="title-search"
              className="w-full rounded-2xl bg-slate-900 py-3 pl-12 pr-4 text-base outline-none ring-1 ring-slate-700 transition focus:ring-yellow-400/70"
              placeholder={mediaType === "tv" ? "Søg efter TV-serie…" : "Søg efter film…"}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={searching || !query.trim() || !connectionReady}
          >
            <SearchIcon />
            {searching ? "Søger…" : "Søg"}
          </button>
        </div>
        {!connectionReady && (
          <p className="mt-2 text-xs text-amber-300">
            Åbn indstillingerne og vælg en forbindelse før søgning.
          </p>
        )}
      </Field>
    </form>
  );
}
