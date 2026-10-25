const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function SearchIcon({ className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><circle cx="11" cy="11" r="6.5" {...common}/><path d="m16 16 4 4" {...common}/></svg>;
}

function BrandAssetIcon({ name, className = "h-5 w-5" }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}icons/${name}.png`}
      alt=""
      aria-hidden="true"
      draggable="false"
      className={`${className} object-contain`}
    />
  );
}

export function SettingsIcon({ className = "h-5 w-5" }) {
  return <BrandAssetIcon name="settings" className={className} />;
}

export function InfoIcon({ className = "h-5 w-5" }) {
  return <BrandAssetIcon name="info" className={className} />;
}

export function TvIcon({ className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" {...common}/><path d="m8 3 4 3 4-3" {...common}/></svg>;
}

export function FilmIcon({ className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><circle cx="12" cy="12" r="9" {...common}/><circle cx="12" cy="7.3" r="1.6" {...common}/><circle cx="16.4" cy="11" r="1.6" {...common}/><circle cx="14.8" cy="16.2" r="1.6" {...common}/><circle cx="9.2" cy="16.2" r="1.6" {...common}/><circle cx="7.6" cy="11" r="1.6" {...common}/></svg>;
}

export function CrownIcon({ className = "h-5 w-5" }) {
  return <BrandAssetIcon name="crown" className={className} />;
}

// User-facing meaning: lit = requests go directly from this browser to TMDB.
// The symbol is intentionally generic (arrow into a globe) rather than a tiny
// reproduction of the TMDB brand mark, which is hard to read at status-bar size.
export function DirectTmdbIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="15" cy="12" r="6.2" {...common}/>
      <path d="M8.8 12h12.4M15 5.8c1.8 1.9 2.7 4 2.7 6.2s-.9 4.3-2.7 6.2c-1.8-1.9-2.7-4-2.7-6.2s.9-4.3 2.7-6.2Z" {...common}/>
      <path d="M2.5 12h5.2M5.7 9.4 8.3 12l-2.6 2.6" {...common}/>
    </svg>
  );
}

export function DanishFlagIcon({ className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><rect x="2.2" y="4" width="19.6" height="16" rx="2" fill="#d71920"/><path d="M8.2 4v16M2.2 10.2h19.6" stroke="#fff" strokeWidth="2.2"/></svg>;
}

export function GlobeIcon({ className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><circle cx="12" cy="12" r="9" {...common}/><path d="M3.4 12h17.2M12 3c2.4 2.5 3.7 5.5 3.7 9S14.4 18.5 12 21c-2.4-2.5-3.7-5.5-3.7-9S9.6 5.5 12 3Z" {...common}/></svg>;
}

export function AdultIcon({ className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><circle cx="12" cy="12" r="8.5" {...common}/><text x="12" y="14.2" textAnchor="middle" fontSize="6.4" fontWeight="800" fill="currentColor" stroke="none">18+</text></svg>;
}

export function OriginalTitleIcon({ className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M5 7V4h3M16 4h3v3M19 17v3h-3M8 20H5v-3" {...common}/><path d="M8.2 8h7.6M12 8v8" {...common}/></svg>;
}

export function AutoTypeIcon({ className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M4 8h13.5l-3-3M20 16H6.5l3 3" {...common}/></svg>;
}

export function CloseIcon({ className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" {...common}/></svg>;
}

export function BackIcon({ className = "h-5 w-5" }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="m14.5 5-7 7 7 7" {...common}/></svg>;
}

export function StatusGlyph({ kind, language, className = "h-5 w-5" }) {
  if (kind === "direct") return <DirectTmdbIcon className={className}/>;
  if (kind === "language") return language === "da-DK" ? <DanishFlagIcon className={className}/> : <GlobeIcon className={className}/>;
  if (kind === "adult") return <AdultIcon className={className}/>;
  if (kind === "original-title") return <OriginalTitleIcon className={className}/>;
  if (kind === "danish") return <DanishFlagIcon className={className}/>;
  if (kind === "alternate-type") return <AutoTypeIcon className={className}/>;
  return null;
}
