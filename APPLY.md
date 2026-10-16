# TAXA-overlap 1.3 statusbar patch

Apply over the current 1.3 smart-search branch.

Changes:
- Adds a compact search-status bar below the search box.
- Shows connection mode, language, adult filter, Danish-only, original-title-only and automatic TV/film fallback.
- Uses the user-facing wording "Via TAXA" instead of "TAXA-proxy".
- Adds a regression test for the statusbar state.

Run after applying:

    npm test
    npm run build
    npm run preview
