TMDB TAXA-overlap — static PWA (no build tools)

Files:
- index.html           (loads React+Tailwind via CDN, Babel for JSX, and app.jsx)
- app.jsx              (your React code, runs through Babel in the browser)
- sw.js                (service worker)
- manifest.webmanifest (PWA manifest)

Deploy:
1) Upload all files to the SAME folder on your webserver, e.g. /var/www/html/taxa/
2) Ensure the site is served over HTTPS (required for service workers).
3) Visit the index.html URL; open the Status panel to enter your TMDB API key or Bearer token.
4) Click “Hent/Opdater TAXA-liste” once; after that, the cache is stored locally.

Dev notes:
- This setup uses Babel in the browser to keep things simple (good for testing). For production, consider bundling with Vite/ESBuild for faster load.
- Tailwind is loaded via CDN. If you prefer vanilla CSS, you can replace the classes or include your own stylesheet.
