import { useEffect, useRef, useState } from "react";
import {
  itemsPerPageForWidth,
  paginateItems,
  titleFor,
  tmdbImageUrl,
  yearFrom,
} from "../domain/overlap.js";
import {
  episodeCountForDisplay,
  episodeDetailsForPerson,
  formatEpisodeDate,
  splitRegularAndSpecialEpisodes,
} from "../domain/referenceSnapshot.js";
import {
  AlphabeticalIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CrownIcon,
  SelectedTitleSortIcon,
  TrashIcon,
} from "./icons.jsx";
import { Pill, Spinner } from "./ui.jsx";

const PAGE_SIZE = 12;

export function OverlapResults({
  sectionRef,
  selected,
  mediaType,
  status,
  overlaps,
  referenceSnapshot,
  referenceSnapshotStatus,
  sortMode,
  onSortModeChange,
  onChangeTitle,
  onNewSearch,
  onEnsureReferenceSnapshot,
}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [sortMode, selected?.id]);

  if (!selected) return null;

  const title = titleFor(selected, mediaType);
  const year = yearFrom(selected, mediaType);
  const poster = tmdbImageUrl(selected.poster_path, "w154");
  const pagination = paginateItems(overlaps, page, PAGE_SIZE);
  const hasMultiplePages = pagination.totalPages > 1;

  const sortOptions = [
    {
      value: "reference",
      label: "Flest TAXA-episoder",
      icon: <CrownIcon className="h-7 w-7" />,
    },
    {
      value: "here",
      label:
        mediaType === "tv"
          ? "Valgt serie – flest episoder"
          : "Valgt film – rækkefølge blandt medvirkende",
      icon: <SelectedTitleSortIcon className="h-5 w-5" />,
    },
    {
      value: "name",
      label: "Alfabetisk A–Z",
      icon: <AlphabeticalIcon className="h-5 w-5" />,
    },
  ];

  function goToPage(nextPage) {
    const next = Math.min(
      pagination.totalPages,
      Math.max(1, Number(nextPage) || 1),
    );
    if (next === pagination.page) return;

    setPage(next);
    requestAnimationFrame(() => {
      sectionRef?.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      sectionRef?.current?.focus({ preventScroll: true });
    });
  }

  return (
    <section ref={sectionRef} tabIndex={-1} className="mb-8 outline-none">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Overlap med TAXA</h2>
        {status === "success" && overlaps.length > 0 && (
          <span className="text-xs text-slate-400">
            {overlaps.length} TAXA-skuespiller{overlaps.length === 1 ? "" : "e"}
          </span>
        )}
      </div>

      <div className="mb-5 rounded-2xl bg-slate-800/60 p-3 ring-1 ring-slate-700">
        <div className="flex gap-3">
          <div className="h-20 w-14 flex-none overflow-hidden rounded-xl bg-slate-700">
            {poster && (
              <img
                src={poster}
                alt={`Plakat for ${title}`}
                width="154"
                height="231"
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-100">{title}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {year ? `${year} · ` : ""}{mediaType === "tv" ? "TV-serie" : "Film"}
                </div>
              </div>

              <div className="flex flex-none items-center gap-2">
                <button
                  type="button"
                  onClick={onChangeTitle}
                  aria-label="Fold søgeresultater ud og skift titel"
                  title="Skift titel"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-slate-300 ring-1 ring-slate-700 transition hover:text-yellow-200 hover:ring-yellow-400/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
                >
                  <ChevronDownIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onNewSearch}
                  aria-label="Ryd søgningen og start forfra"
                  title="Ny søgning"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 ring-1 ring-slate-700 transition hover:text-slate-200 hover:ring-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
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
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Sortér
            </span>
            <div
              className="inline-flex rounded-2xl bg-slate-950/50 p-1 ring-1 ring-slate-700"
              role="group"
              aria-label="Sortér TAXA-overlap"
            >
              {sortOptions.map((option) => {
                const active = sortMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    aria-label={option.label}
                    title={option.label}
                    onClick={() => onSortModeChange(option.value)}
                    className={`inline-flex h-10 w-11 items-center justify-center rounded-xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300 ${
                      active
                        ? "bg-yellow-400/10 text-yellow-300 ring-1 ring-yellow-400/50"
                        : "text-slate-500 hover:bg-slate-800/70 hover:text-slate-200"
                    }`}
                  >
                    {option.icon}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid min-w-0 gap-3">
            {pagination.items.map((match) => (
              <OverlapCard
                key={match.personId}
                match={match}
                referenceSnapshot={referenceSnapshot}
                referenceSnapshotStatus={referenceSnapshotStatus}
                onEnsureReferenceSnapshot={onEnsureReferenceSnapshot}
              />
            ))}
          </div>

          {hasMultiplePages && (
            <nav
              className="mt-5 flex items-center justify-center gap-3"
              aria-label="Sider med TAXA-overlap"
            >
              <button
                type="button"
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                aria-label="Forrige side"
                title="Forrige side"
                className="inline-flex h-10 items-center gap-1 rounded-xl bg-slate-800/70 px-3 text-sm text-slate-200 ring-1 ring-slate-700 hover:ring-slate-500 disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
              >
                <ChevronLeftIcon />
                <span className="hidden sm:inline">Forrige</span>
              </button>

              <span className="min-w-20 text-center text-xs text-slate-400">
                {pagination.page} af {pagination.totalPages}
              </span>

              <button
                type="button"
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                aria-label="Næste side"
                title="Næste side"
                className="inline-flex h-10 items-center gap-1 rounded-xl bg-slate-800/70 px-3 text-sm text-slate-200 ring-1 ring-slate-700 hover:ring-slate-500 disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
              >
                <span className="hidden sm:inline">Næste</span>
                <ChevronRightIcon />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

function OverlapCard({
  match,
  referenceSnapshot,
  referenceSnapshotStatus,
  onEnsureReferenceSnapshot,
}) {
  const profile = tmdbImageUrl(match.profilePath, "w185");
  const [open, setOpen] = useState(false);
  const episodeDetails = episodeDetailsForPerson(referenceSnapshot, match.personId);
  const { regular, specials } = splitRegularAndSpecialEpisodes(episodeDetails);
  const hasEpisodeIndex = episodeDetails.length > 0;
  // Det konkrete indeks inkluderer specials (season 0), som TMDB aggregate credits
  // ikke tæller med. Brug derfor indekslængden til det viste total, når den findes.
  const displayEpisodeCount = episodeCountForDisplay(
    episodeDetails,
    match.referenceEpisodes,
  );

  async function toggleEpisodeIndex() {
    if (open) {
      setOpen(false);
      return;
    }

    // Fold altid kortet ud. Hvis snapshot'et ikke er tilgængeligt endnu,
    // forsøg at hente det igen; EpisodeIndex viser status undervejs/ved fejl.
    setOpen(true);
    if (!referenceSnapshot && referenceSnapshotStatus !== "loading") {
      await onEnsureReferenceSnapshot?.();
    }
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl bg-slate-800/60 p-3 ring-1 ring-slate-700">
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
              aria-label={`${open ? "Skjul" : "Vis"} konkrete TAXA-episoder for ${match.name}`}
              onClick={toggleEpisodeIndex}
            >
              <span className="text-slate-500">Rolle(r) i TAXA: </span>
              {match.referenceRoles.map((role, index) => (
                <Pill key={`${role.character}-${index}`}>{role.character}</Pill>
              ))}
              <span className="ml-1 text-slate-300">
                <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>›</span>{" "}
                {displayEpisodeCount} episoder
              </span>
            </button>
          </div>
        </div>
      </div>

      {open && (
        <EpisodeIndex
          regular={regular}
          specials={specials}
          aggregateCount={match.referenceEpisodes}
          status={referenceSnapshotStatus}
          onRetry={onEnsureReferenceSnapshot}
        />
      )}
    </article>
  );
}

function EpisodeIndex({ regular, specials, aggregateCount, status, onRetry }) {
  if (status === "loading") {
    return (
      <div className="ml-[3.75rem] mt-3 border-l border-slate-700 pl-3">
        <Spinner label="Henter episodeindeks…" />
      </div>
    );
  }

  if (!regular.length && !specials.length) {
    return (
      <div className="ml-[3.75rem] mt-3 border-l border-slate-700 pl-3 text-xs text-slate-400">
        <div>Konkrete episodeoplysninger er ikke tilgængelige lige nu.</div>
        {status === "unavailable" && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-lg bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-200 ring-1 ring-slate-700 hover:ring-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
          >
            Prøv igen
          </button>
        )}
      </div>
    );
  }

  const allEpisodes = [...regular, ...specials];

  return (
    <div className="ml-[3.75rem] mt-3 min-w-0 border-l border-slate-700 pl-3 text-xs">
      <EpisodeCarousel episodes={allEpisodes} />

      {regular.length !== aggregateCount && (
        <div className="mt-3 text-[0.7rem] leading-relaxed text-slate-500">
          {regular.length} almindelige episoder er registreret i episodeindekset; TAXA-credits angiver {aggregateCount}.
        </div>
      )}
    </div>
  );
}

function EpisodeCarousel({ episodes }) {
  const viewportRef = useRef(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(1);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    function updateItemsPerPage() {
      const next = itemsPerPageForWidth(viewport.clientWidth, {
        minItemWidth: 180,
        gap: 10,
        maxItems: 5,
      });
      setItemsPerPage(next);
    }

    updateItemsPerPage();
    const observer = new ResizeObserver(updateItemsPerPage);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  const totalPages = Math.max(1, Math.ceil(episodes.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * itemsPerPage;
  const visibleEpisodes = episodes.slice(start, start + itemsPerPage);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [episodes]);

  function goToPage(nextPage) {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
  }

  return (
    <div className="episode-carousel" ref={viewportRef}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-slate-500">
          Episoder
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2" aria-label="Navigér i episoder">
            <button
              type="button"
              className="episode-scroll-button"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              aria-label="Vis tidligere episoder"
              title="Tidligere episoder"
            >
              <ChevronLeftIcon />
            </button>
            <span className="min-w-12 text-center text-[0.68rem] text-slate-500" aria-live="polite">
              {safePage} af {totalPages}
            </span>
            <button
              type="button"
              className="episode-scroll-button"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
              aria-label="Vis flere episoder"
              title="Flere episoder"
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>

      <div
        className="episode-page"
        // Behold samme kolonnebredde på sidste side. Tomme grid-spor
        // fungerer som usynlige pladsholdere, så ét sidste kort ikke strækkes.
        style={{ "--episode-columns": itemsPerPage }}
      >
        {visibleEpisodes.map((episode) => (
          <EpisodeCard key={episode.key} episode={episode} special={episode.season === 0} />
        ))}
      </div>
    </div>
  );
}

function EpisodeCard({ episode, special = false }) {
  const date = formatEpisodeDate(episode.air_date);

  return (
    <article className={`episode-card ${special ? "is-special" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`episode-code ${special ? "is-special" : ""}`}>
          {episode.key}
        </span>
        {special && <span className="episode-special-label">Special</span>}
      </div>

      <div className="mt-2 font-medium leading-snug text-slate-200">
        {episode.name || "(uden titel)"}
      </div>

      {episode.overview && (
        <p className="episode-overview mt-2 text-[0.72rem] leading-relaxed text-slate-400">
          {episode.overview}
        </p>
      )}

      {date && (
        <div className="mt-auto pt-3 text-[0.68rem] text-slate-500">
          {date}
        </div>
      )}
    </article>
  );
}
