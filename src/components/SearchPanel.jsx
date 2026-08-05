import { Field, Label } from "./ui.jsx";

export function SearchPanel({
  mediaType,
  onMediaTypeChange,
  language,
  onLanguageChange,
  query,
  onQueryChange,
  onSearch,
  searching,
  connectionReady,
}) {
  function submit(event) {
    event.preventDefault();
    onSearch();
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-slate-800/60 p-4 shadow md:col-span-2"
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Field>
          <Label>Type</Label>
          <div className="flex gap-2" role="group" aria-label="Medietype">
            {["tv", "movie"].map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={mediaType === type}
                onClick={() => onMediaTypeChange(type)}
                className={`rounded-2xl px-3 py-2 ring-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                  mediaType === type
                    ? "bg-sky-500/10 ring-sky-500"
                    : "bg-slate-900 ring-slate-700"
                }`}
              >
                {type === "tv" ? "TV-serie" : "Film"}
              </button>
            ))}
          </div>
        </Field>

        <Field>
          <Label htmlFor="language">Sprog for titler</Label>
          <select
            id="language"
            className="w-full rounded-xl bg-slate-900 px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
            value={language}
            onChange={(event) => onLanguageChange(event.target.value)}
          >
            <option value="da-DK">Dansk (da-DK)</option>
            <option value="en-US">Engelsk (en-US)</option>
            <option value="sv-SE">Svensk (sv-SE)</option>
            <option value="nb-NO">Norsk (nb-NO)</option>
            <option value="de-DE">Tysk (de-DE)</option>
          </select>
        </Field>
      </div>

      <Field>
        <Label htmlFor="title-search">Søg titel</Label>
        <div className="flex gap-2">
          <input
            id="title-search"
            className="min-w-0 flex-1 rounded-xl bg-slate-900 px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
            placeholder={
              mediaType === "tv"
                ? "Søg efter TV-serie…"
                : "Søg efter film…"
            }
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <button
            type="submit"
            className="rounded-2xl bg-slate-900 px-4 py-2 ring-1 ring-slate-700 hover:ring-sky-500 disabled:opacity-50"
            disabled={searching || !query.trim() || !connectionReady}
          >
            {searching ? "Søger…" : "Søg"}
          </button>
        </div>
        {!connectionReady && (
          <p className="mt-2 text-xs text-amber-300">
            Konfigurér en proxy eller din egen TMDB-nøgle før søgning.
          </p>
        )}
      </Field>
    </form>
  );
}
