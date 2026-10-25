# Apply

Unpack this patch over the current TAXA-overlap 1.4 working tree.

Changes:
- transparent neon header/about logo
- dark circular crown favicon for 32/64 px
- service-worker cache bump to `taxa-overlap-v1.4-ui4`
- updated graphics notes

Then run:

```bash
npm test
npm run build
npm run preview
```

Because the service worker caches graphics, a hard reload or reopening an installed PWA may be needed once after deployment.
