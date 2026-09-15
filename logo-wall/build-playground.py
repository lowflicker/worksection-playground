#!/usr/bin/env python3
"""Assemble ../index.html (the playground) from playground.template.html and the module files.

Run after editing logo-wall.css, logo-wall.js, anything in logos/,
short-answer/short-answer.css / short-answer.js, or float-actions/float-actions.css / float-actions.js:
    python3 logo-wall/build-playground.py
"""
import json
from pathlib import Path

here = Path(__file__).resolve().parent
template = (here / "playground.template.html").read_text(encoding="utf-8")
sa = here.parent / "short-answer"
fa = here.parent / "float-actions"

out = (
    template
    .replace("__CSS__", (here / "logo-wall.css").read_text(encoding="utf-8").strip())
    .replace("__JS__", (here / "logo-wall.js").read_text(encoding="utf-8").strip())
    .replace("__SA_CSS__", (sa / "short-answer.css").read_text(encoding="utf-8").strip())
    .replace("__SA_JS__", (sa / "short-answer.js").read_text(encoding="utf-8").strip())
    .replace("__FA_CSS__", (fa / "float-actions.css").read_text(encoding="utf-8").strip())
    .replace("__FA_JS__", (fa / "float-actions.js").read_text(encoding="utf-8").strip())
    .replace("__LOGO_FILES__", json.dumps(
        {f"logos/{p.name}": p.read_text(encoding="utf-8").strip() for p in sorted((here / "logos").glob("*.svg"))},
        ensure_ascii=False, indent=2))
)

target = here.parent / "index.html"
target.write_text(out, encoding="utf-8")
print(f"wrote {target} ({len(out):,} bytes)")
