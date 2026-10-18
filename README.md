# PDF Page Splitter

Keep only the pages you pick, or cut out a page range, from a PDF. Everything runs in your browser, so your file is never uploaded anywhere.

**Use it:** https://afieif.github.io/pdf-splitter/

## Features

- **Pick pages:** tap thumbnails, or type pages and ranges like `1, 3, 5-7`. Quick buttons select all, none, odd or even pages.
- **Page range:** keep everything from one page to another (both ends included).
- **Private:** the PDF is read and rebuilt on your device with [pdf-lib](https://pdf-lib.js.org/). Thumbnails come from [PDF.js](https://mozilla.github.io/pdf.js/).
- **Installable and offline:** it's a PWA. Install it from your browser and it works with no connection.
- **Open with / share to:** once installed, you can open PDFs with the app from your computer, or share a PDF to it from other apps on Android.
- **Handles big files:** thumbnails are drawn only near the visible part of the page, so memory use stays steady on long documents.
- On iPhone and iPad the result is offered through the share sheet so you can pick "Save to Files".

## Run locally

You need Python 3. There are no other dependencies.

```sh
python3 build.py                       # build the app into dist/
python3 -m http.server -d dist 8000    # preview at http://localhost:8000
```

## How it's put together

| File | Purpose |
| --- | --- |
| `index.html` | The whole app (markup, styles and script), written as a page body |
| `build.py` | Wraps `index.html` into a full document, adds the manifest, icons and service worker, switches the CDN libraries to the local copies in `lib/`, and stamps a cache version |
| `sw.js` | Service worker: offline caching and receiving shared PDFs |
| `manifest.webmanifest` | PWA manifest, including file handler and share target |
| `lib/` | Bundled copies of pdf-lib 1.17.1 and PDF.js 3.11.174 |
| `icons/` | App icons |

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which builds with `build.py` and publishes `dist/` to GitHub Pages.
