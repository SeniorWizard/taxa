import { APP_VERSION } from "../config.js";

export function AboutPage({ onBack }) {
  return (
    <main className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full px-3 py-2 text-sm text-slate-300 ring-1 ring-slate-700 hover:ring-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
        >
          ← Tilbage
        </button>
        <span className="text-xs text-slate-500">Version {APP_VERSION}</span>
      </div>

      <section className="rounded-3xl bg-slate-800/60 p-6 shadow md:p-8">
        <div className="mb-8 flex items-center gap-4">
          <img
            src={`${import.meta.env.BASE_URL}icons/icon.svg`}
            alt="TAXA-overlap"
            className="h-16 w-16 rounded-2xl ring-1 ring-slate-700"
          />
          <div>
            <h1 className="text-2xl font-semibold">TAXA-overlap</h1>
            <p className="mt-1 text-sm text-slate-400">Find TAXA-skuespillere i film og serier.</p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-6 text-slate-300">
          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-100">Om appen</h2>
            <p>
              TAXA-overlap sammenligner medvirkende i en valgt film eller TV-serie med casten fra TAXA. Resultaterne bygger på data fra TMDB.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-100">Forbindelse og privatliv</h2>
            <p>
              Som standard bruges TAXA-proxyen. Du kan vælge direkte forbindelse til TMDB og gemme din egen nøgle lokalt i browseren. Proxyen returnerer ikke TMDB-nøglen til browseren.
            </p>
          </section>

          <section className="rounded-2xl bg-slate-900/50 p-4 ring-1 ring-slate-700">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">TMDB</div>
            <div className="mb-3 inline-flex rounded-lg bg-[#0d253f] px-3 py-2 text-lg font-black tracking-tight text-white ring-1 ring-slate-600">
              TMDB
            </div>
            <p>
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sky-300 underline underline-offset-2 hover:text-sky-200"
            >
              themoviedb.org
            </a>
          </section>
        </div>
      </section>
    </main>
  );
}
