# Anvend patchen på version-1.2-branchen

Fra repository-roden:

```bash
unzip ~/Downloads/taxa-overlap-php-proxy-1.2.0-patch.zip -d /tmp/taxa-proxy-patch
rsync -av /tmp/taxa-proxy-patch/ ./

npm install --package-lock-only
npm test
php backend/tests/run.php
npm run build

git status --short
git add -A
git diff --cached --check
```

`npm install --package-lock-only` opdaterer rodversionen i `package-lock.json`; der er ingen nye npm-afhængigheder.

Konfigurér først proxy-URL'en, når PHP-proxyen er installeret:

```text
GitHub → Settings → Secrets and variables → Actions → Variables
VITE_TMDB_PROXY_URL=https://api.foo.dk/tmdb/index.php
```

Se `docs/SYNOLOGY_DEPLOYMENT.md` og `backend/README.md`.
