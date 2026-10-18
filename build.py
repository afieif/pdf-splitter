"""Builds the installable app (PWA) into dist/.

index.html is written as a page body so it can also be published as a claude.ai artifact.
This script wraps it in a full HTML document with the app's manifest, icons and service worker,
points the CDN libraries at the copies in lib/ (so the app works offline), copies the assets
next to it, and stamps the service worker with a content hash.

    python3 build.py                       # build into dist/
    python3 -m http.server -d dist 8000    # preview at http://localhost:8000
"""
import hashlib, pathlib, shutil

ROOT = pathlib.Path(__file__).parent
DIST = ROOT / "dist"
ASSETS = ["manifest.webmanifest", "lib", "icons"]
# The artifact loads these from cdnjs; the installed app uses the copies in lib/.
CDN_TO_LOCAL = {
    "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/": "lib/",
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/": "lib/",
}

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/favicon-64.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="theme-color" content="#f3f4f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#12151c" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="PDF Splitter">
<script>
  if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
</script>
"""

def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    body = (ROOT / "index.html").read_text()
    for cdn, local in CDN_TO_LOCAL.items():
        if cdn not in body:
            raise SystemExit(f"index.html no longer references {cdn}; update CDN_TO_LOCAL and lib/")
        body = body.replace(cdn, local)
    page = HEAD + body + "\n</html>\n"
    (DIST / "index.html").write_text(page)

    digest = hashlib.sha256(page.encode())
    for name in ASSETS:
        src = ROOT / name
        if src.is_dir():
            shutil.copytree(src, DIST / name)
            files = sorted(p for p in src.rglob("*") if p.is_file())
        else:
            shutil.copy2(src, DIST / name)
            files = [src]
        for f in files:
            digest.update(f.read_bytes())

    sw = (ROOT / "sw.js").read_text().replace("__VERSION__", digest.hexdigest()[:12])
    (DIST / "sw.js").write_text(sw)
    print(f"Built {DIST} (version {digest.hexdigest()[:12]})")

if __name__ == "__main__":
    main()
