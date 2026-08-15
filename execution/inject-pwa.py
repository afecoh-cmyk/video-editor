#!/usr/bin/env python3
"""PWA meta + service worker a dist/index.html-be."""
from pathlib import Path

html_path = Path(__file__).resolve().parent.parent / "dist" / "index.html"
html = html_path.read_text(encoding="utf-8")
html = html.replace('<html lang="en">', '<html lang="hu">')
tags = """    <meta name="theme-color" content="#1A2332" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Muffe Plan" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
"""
if 'rel="manifest"' not in html:
    html = html.replace("</head>", tags + "</head>")
script = """  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js');
      });
    }
  </script>
"""
if "serviceWorker.register" not in html:
    html = html.replace("</body>", script + "</body>")
html_path.write_text(html, encoding="utf-8")
print("✔ PWA meta beillesztve: dist/index.html")
