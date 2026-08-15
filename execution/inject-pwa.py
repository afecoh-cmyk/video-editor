#!/usr/bin/env python3
"""PWA meta + service worker a dist/index.html-be. WEB_BASE_PATH: GitHub Pages almappa."""
import json
import os
from pathlib import Path

html_path = Path(__file__).resolve().parent.parent / "dist" / "index.html"
html = html_path.read_text(encoding="utf-8")
html = html.replace('<html lang="en">', '<html lang="hu">')

base = os.environ.get("WEB_BASE_PATH", "").rstrip("/")
prefix = f"{base}/" if base else "/"


def rooted(path: str) -> str:
    return f"{prefix}{path.lstrip('/')}"


tags = f"""    <meta name="theme-color" content="#1A2332" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Muffe Plan" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="{rooted('manifest.webmanifest')}" />
    <link rel="apple-touch-icon" href="{rooted('apple-touch-icon.png')}" />
"""
if 'rel="manifest"' not in html:
    html = html.replace("</head>", tags + "</head>")
script = f"""  <script>
    if ('serviceWorker' in navigator) {{
      window.addEventListener('load', function () {{
        navigator.serviceWorker.register('{rooted('sw.js')}');
      }});
    }}
  </script>
"""
if "serviceWorker.register" not in html:
    html = html.replace("</body>", script + "</body>")
if base and 'href="/favicon.ico"' in html:
    html = html.replace('href="/favicon.ico"', f'href="{rooted("favicon.ico")}"')
html_path.write_text(html, encoding="utf-8")

manifest_path = Path(__file__).resolve().parent.parent / "dist" / "manifest.webmanifest"
if manifest_path.exists():
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["id"] = prefix
    manifest["start_url"] = prefix
    manifest["scope"] = prefix
    for icon in manifest.get("icons", []):
        src = icon.get("src", "")
        if src:
            icon["src"] = rooted(src.rsplit("/", 1)[-1])
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

print("✔ PWA meta beillesztve: dist/index.html")
