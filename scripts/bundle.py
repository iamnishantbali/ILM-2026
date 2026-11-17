#!/usr/bin/env python3
"""Bundle the prototype into a single artifact body (no doctype/head/body —
the artifact host wraps it) by inlining styles.css and app.js into index.html.

    python3 scripts/bundle.py --out build/ilm-prototype.html
    python3 scripts/bundle.py --tweaks --out build/ilm-prototype-tweaks.html
    python3 scripts/bundle.py --standalone --out build/local.html   # full page for local testing

--tweaks adds the prototype variants panel (tweaks/panel.css + panel.js)
and retitles the page "ILM 2026 Tweaks" so the two artifacts are easy to
tell apart. The team build never includes the panel.
"""
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_TITLE = "<title>ILM 2026 — Snapshot Prototype</title>"


def build(tweaks: bool, standalone: bool) -> str:
    html = (ROOT / "index.html").read_text()
    css = (ROOT / "styles.css").read_text()
    js = (ROOT / "app.js").read_text()

    title = "ILM 2026 Tweaks" if tweaks else "ILM 2026 Prototype"
    assert html.count(SRC_TITLE) == 1
    html = html.replace(SRC_TITLE, f"<title>{title}</title>")

    style = f"<style>\n{css}\n</style>"
    script = f"<script>\n{js}\n</script>"
    if tweaks:
        style += f"\n<style>\n{(ROOT / 'tweaks' / 'panel.css').read_text()}\n</style>"
        # The panel must run before app.js so window.ILM_VARIANTS is set first
        script = f"<script>\n{(ROOT / 'tweaks' / 'panel.js').read_text()}\n</script>\n" + script

    assert html.count('<link rel="stylesheet" href="styles.css" />') == 1
    assert html.count('<script src="app.js"></script>') == 1
    html = html.replace('<link rel="stylesheet" href="styles.css" />', style)
    html = html.replace('<script src="app.js"></script>', script)

    if standalone:
        return html
    html = re.sub(r"^<!DOCTYPE html>\s*<html[^>]*>\s*<head>\s*", "", html)
    html = html.replace("</head>\n<body>\n", "").replace("</body>\n</html>\n", "")
    assert "<head>" not in html and "styles.css" not in html
    return html


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--tweaks", action="store_true")
    ap.add_argument("--standalone", action="store_true")
    args = ap.parse_args()
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build(args.tweaks, args.standalone))
    print(f"wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
