# One-off, not part of the module and not a build step: rebuilds hero-section/img
# from the Figma PNG exports (python3 build.py <src dir> <out dir>): AVIF + WebP,
# plus a 1280 px desktop variant for phones.
import sys, os
from PIL import Image
SRC_DIR, OUT = sys.argv[1], sys.argv[2]
# source exports from Figma, 2x: <name>-hero-desk.png 2496x1528, <name>-hero-phone.png 804x1748
SRC = { 'dashboard': 'dashboard', 'tasks': 'tasks', 'gantt': 'gantt', 'communication': 'chat', 'reports': 'reports', 'time-tracking': 'workload', 'task-details': 'taskview' }
VIEWS = ['dashboard', 'tasks', 'gantt', 'communication', 'reports', 'time-tracking', 'task-details']
def fit(im, w):
    im = im.convert('RGB')
    return im if im.width == w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
# the phone-facing files (1280 desktop, phone) render at half their pixels or less, so they take a lower quality
def save(im, name, q=60, qw=78):
    im.save(f'{OUT}/{name}.avif', 'AVIF', quality=q, speed=4)
    im.save(f'{OUT}/{name}.webp', 'WEBP', quality=qw, method=6)
for v in VIEWS:
    d, p = fit(Image.open(f'{SRC_DIR}/{SRC[v]}-hero-desk.png'), 2496), fit(Image.open(f'{SRC_DIR}/{SRC[v]}-hero-phone.png'), 804)
    save(d, v); save(d.resize((1280, round(d.height * 1280 / d.width)), Image.LANCZOS), f'{v}-1280', 50, 72); save(p, f'{v}-phone', 52, 72)
    print(v, 'ok')
