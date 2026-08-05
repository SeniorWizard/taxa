export function Field({ children }) {
  return <div className="mb-4">{children}</div>;
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
      className="inline-flex rounded-full bg-slate-700/60 px-2 py-0.5 text-xs"
    >
      {children}
    </span>
  );
}
