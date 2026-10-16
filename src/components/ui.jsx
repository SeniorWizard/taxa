export function Field({ children, className = "" }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm text-slate-300">
      {children}
    </label>
  );
}

export function Pill({ children, title }) {
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-full bg-slate-700/60 px-2 py-0.5 text-xs"
    >
      {children}
    </span>
  );
}

export function IconButton({ label, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/70 text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-800 hover:ring-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${className}`}
    >
      {children}
    </button>
  );
}

export function Spinner({ label = "Arbejder…" }) {
  return (
    <div className="flex items-center gap-3 text-slate-300" role="status">
      <span className="taxa-loader" aria-hidden="true">
        <span className="taxa-loader-wheel" />
      </span>
      <span>{label}</span>
    </div>
  );
}
