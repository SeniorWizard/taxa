import { useState } from "react";
import { titleFor, tmdbImageUrl, yearFrom } from "../domain/overlap.js";
import { Pill, Spinner } from "./ui.jsx";

export function OverlapResults({
  sectionRef,
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
    <section ref={sectionRef} tabIndex={-1} className="mb-8 outline-none">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Overlap med TAXA</h2>
          <p className="mt-1 text-sm text-slate-400">{title}{year ? ` · ${year}` : ""}</p>
        </div>

        {status === "success" && overlaps.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="sort-mode" className="hidden text-slate-500 sm:inline">Sortér</label>
            <select
              id="sort-mode"
              className="rounded-xl bg-slate-900 px-2 py-1.5 text-xs ring-1 ring-slate-700 focus:ring-yellow-400/70"
              value={sortMode}
              onChange={(event) => onSortModeChange(event.target.value)}
            >
              <option value="reference">TAXA-episoder</option>
              <option value="here">
                {mediaType === "tv" ? "Episoder i valgt serie" : "Billing-orden"}
              </option>
              <option value="name">Alfabetisk</option>
            </select>
          </div>
        )}
      </div>

      {status === "loading" && <Spinner label="Tjekker medvirkende…" />}

      {status === "error" && (
        <div role="alert" className="rounded-2xl bg-red-900/30 p-4 text-sm text-red-200 ring-1 ring-red-800">
          Kunne ikke beregne overlap for titlen.
        </div>
      )}

      {status === "success" && overlaps.length === 0 && (
        <div className="rounded-2xl bg-emerald-900/30 p-4 text-sm text-emerald-200 ring-1 ring-emerald-800">
          Tillykke – du har fundet en TAXA-fri {mediaType === "tv" ? "serie" : "film"}.
        </div>
      )}

      {status === "success" && overlaps.length > 0 && (
        <div className="mb-3 text-xs text-slate-500">{overlaps.length} overlap{overlaps.length === 1 ? "" : "s"}</div>
      )}

      {status === "success" && overlaps.length > 0 && (
        <div className="grid gap-3">
          {overlaps.map((match) => (
            <OverlapCard key={match.personId} match={match} />
          ))}
        </div>
      )}
    </section>
  );
}

function OverlapCard({ match }) {
  const profile = tmdbImageUrl(match.profilePath, "w185");
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-2xl bg-slate-800/60 p-3 ring-1 ring-slate-700">
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

          <div className="text-sm">
            <div className="mb-1">
              <span className="text-slate-500">Rolle i valgt titel: </span>
              <span className="inline-flex flex-wrap gap-1">
                {match.hereRoles.map((role, index) => (
                  <Pill key={`${role.character}-${index}`}>
                    {role.character}
                    {role.episodes ? ` · ${role.episodes} eps` : ""}
                  </Pill>
                ))}
              </span>
            </div>

            <button
              type="button"
              className="group -ml-1 inline-flex flex-wrap items-center gap-1 rounded-lg px-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <span className="text-slate-500">Rolle(r) i TAXA: </span>
              {match.referenceRoles.map((role, index) => (
                <Pill key={`${role.character}-${index}`}>{role.character}</Pill>
              ))}
              <span className="ml-1 text-slate-300">› {match.referenceEpisodes} episoder</span>
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="ml-[3.75rem] mt-3 border-l border-slate-700 pl-3 text-xs text-slate-400">
          Episodeoplysninger er endnu ikke en del af version 1.3. Når episodeindekset kommer, vises de her.
        </div>
      )}
    </article>
  );
}
