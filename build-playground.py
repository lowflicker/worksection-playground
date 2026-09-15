#!/usr/bin/env python3
"""Assemble index.html (the playground) from playground.template.html and the module files.

Run after editing any module's css / js, or anything in logo-wall/logos/:
    python3 build-playground.py

Every module is inlined into the one file so the playground works from file://
and on GitHub Pages without a server.
"""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
template = (root / "playground.template.html").read_text(encoding="utf-8")

def src(*parts):
    return (root.joinpath(*parts)).read_text(encoding="utf-8").strip()

def js(*parts):
    # a literal </script> anywhere in the source (say, a usage comment) would end the inline tag early
    return src(*parts).replace("</script", "<\\/script")

logos = root / "logo-wall" / "logos"

out = (
    template
    .replace("__CSS__", src("logo-wall", "logo-wall.css"))
    .replace("__JS__", js("logo-wall", "logo-wall.js"))
    .replace("__SA_CSS__", src("short-answer", "short-answer.css"))
    .replace("__SA_JS__", js("short-answer", "short-answer.js"))
    .replace("__FA_CSS__", src("float-actions", "float-actions.css"))
    .replace("__FA_JS__", js("float-actions", "float-actions.js"))
    .replace("__BB_CSS__", src("border-beam", "beam.css"))
    .replace("__BB_JS__", js("border-beam", "beam.js"))
    .replace("__DS_JS__", js("dot-sphere", "sphere.js"))
    .replace("__LOGO_FILES__", json.dumps(
        {f"logos/{p.name}": p.read_text(encoding="utf-8").strip() for p in sorted(logos.glob("*.svg"))},
        ensure_ascii=False, indent=2))
)

target = root / "index.html"
target.write_text(out, encoding="utf-8")
print(f"wrote {target} ({len(out):,} bytes)")
