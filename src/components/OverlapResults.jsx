import { titleFor, tmdbImageUrl, yearFrom } from "../domain/overlap.js";
import { Pill } from "./ui.jsx";

export function OverlapResults({
  selected,
  mediaType,
  status,
  overlaps,
  sortMode,
  onSortModeChange,
}) {
  if (!selected) return null;

  const title = titleFor(selected, mediaType);
  const year = yearFrom(selected, mediaType);

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Overlap med TAXA</h2>
          <p className="text-sm text-slate-400">
            {title}{year ? ` (${year})` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="sort-mode" className="hidden text-slate-400 sm:inline">
            Sortér efter
          </label>
          <select
            id="sort-mode"
            className="rounded-xl bg-slate-900 px-2 py-1 ring-1 ring-slate-700 focus:ring-sky-500"
            value={sortMode}
            onChange={(event) => onSortModeChange(event.target.value)}
          >
            <option value="reference">TAXA-episoder (standard)</option>
            <option value="here">
              {mediaType === "tv"
                ? "Episoder i valgt serie"
                : "Billing-orden (film)"}
            </option>
            <option value="name">Alfabetisk (A–Å)</option>
          </select>
        </div>
      </div>

      {status === "loading" && (
        <div role="status" className="text-slate-300">
          Tjekker medvirkende…
        </div>
      )}

      {status === "success" && overlaps.length === 0 && (
        <div
          role="status"
          className="rounded-xl bg-emerald-900/30 p-4 text-emerald-200 ring-1 ring-emerald-800"
        >
          Tillykke – du har fundet en TAXA-fri {mediaType === "tv" ? "serie" : "film"}.
        </div>
      )}

      {status === "success" && overlaps.length > 0 && (
        <div className="grid gap-3">
          {overlaps.map((match) => {
            const profile = tmdbImageUrl(match.profilePath, "w185");
            return (
              <article
                key={match.personId}
                className="rounded-2xl bg-slate-800/60 p-3 ring-1 ring-slate-700"
              >
                <div className="flex gap-3">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-700">
                    {profile && (
                      <img
                        src={profile}
                        alt={match.name}
                        width="185"
                        height="278"
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 font-medium">{match.name}</div>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-slate-400">Rolle i valgt titel: </span>
                        <span className="inline-flex flex-wrap gap-1">
                          {match.hereRoles.map((role, index) => (
                            <Pill key={`${role.character}-${index}`}>
                              {role.character}
                              {role.episodes ? ` • ${role.episodes} eps` : ""}
                            </Pill>
                          ))}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400">Rolle(r) i TAXA: </span>
                        <span className="inline-flex flex-wrap gap-1">
                          {match.referenceRoles.map((role, index) => (
                            <Pill key={`${role.character}-${index}`}>
                              {role.character}
                              {role.episodes ? ` • ${role.episodes} eps` : ""}
                            </Pill>
                          ))}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">
                          (i alt {match.referenceEpisodes} episoder)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
