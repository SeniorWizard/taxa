export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  const base = import.meta.env.BASE_URL;
  navigator.serviceWorker
    .register(`${base}sw.js`, { scope: base })
    .catch((error) => {
      console.warn("Service worker kunne ikke registreres:", error);
    });
}
