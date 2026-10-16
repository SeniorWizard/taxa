import { Field, Label } from "./ui.jsx";

function SearchStatusBar({ items }) {
  return (
    <div
      className="mb-5 flex flex-wrap gap-2 text-xs"
      aria-label="Aktive søgeindstillinger"
    >
      {items.map((item) => (
        <span
          key={item.key}
          title={item.title}
          className={`inline-flex items-center rounded-full px-2.5 py-1 ring-1 transition ${
            item.active
              ? "bg-yellow-400/10 text-yellow-200 ring-yellow-400/30"
              : "bg-slate-900/50 text-slate-500 ring-slate-700"
          }`}
          aria-label={`${item.label}: ${item.active ? "til" : "fra"}. ${item.title}`}
        >
          <span className="sm:hidden">{item.shortLabel}</span>
          <span className="hidden sm:inline">{item.label}</span>
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
      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Medietype">
        {["tv", "movie"].map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={mediaType === type}
            onClick={() => onMediaTypeChange(type)}
            className={`rounded-full px-4 py-2 text-sm font-medium ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
              mediaType === type
                ? "bg-yellow-400/15 text-yellow-200 ring-yellow-400/70"
                : "bg-slate-900/60 text-slate-300 ring-slate-700 hover:ring-slate-500"
            }`}
          >
            {type === "tv" ? "TV-serie" : "Film"}
          </button>
        ))}
      </div>

      <Field className="mb-0">
        <Label htmlFor="title-search">Søg titel</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="title-search"
            className="min-w-0 flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-base outline-none ring-1 ring-slate-700 transition focus:ring-yellow-400/70"
            placeholder={
              mediaType === "tv"
                ? "Søg efter TV-serie…"
                : "Søg efter film…"
            }
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            className="rounded-2xl bg-yellow-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={searching || !query.trim() || !connectionReady}
          >
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
