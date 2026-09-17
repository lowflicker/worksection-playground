# One-off, not part of the module and not a build step: rebuilds hero-section/img
# from source PNGs (python3 build.py <src dir> <out dir>). Real screenshots go in SRC;
# views missing there are hue-shifted copies of dashboard so the demo can switch.
import sys, os
from PIL import Image
SRC_DIR, OUT = sys.argv[1], sys.argv[2]
SRC = { 'dashboard': ('dashboard.png', 'dashboard-phone.png') }  # desktop 2496 px, phone 804 px
VIEWS = ['dashboard', 'tasks', 'gantt', 'communication', 'reports', 'time-tracking', 'task-details']
HUE = { 'tasks': 40, 'gantt': 80, 'communication': 150, 'reports': 200, 'time-tracking': 260, 'task-details': 310 }
def shift(im, deg):
    h, s, v = im.convert('HSV').split()
    h = h.point(lambda x: (x + int(deg * 255 / 360)) % 256)
    return Image.merge('HSV', (h, s, v)).convert('RGB')
def save(im, name):
    im.save(f'{OUT}/{name}.avif', 'AVIF', quality=60, speed=4)
    im.save(f'{OUT}/{name}.webp', 'WEBP', quality=78, method=6)
base_d = Image.open(f'{SRC_DIR}/{SRC["dashboard"][0]}').convert('RGB'); base_p = Image.open(f'{SRC_DIR}/{SRC["dashboard"][1]}').convert('RGB')
for v in VIEWS:
    if v in SRC: d, p = Image.open(f'{SRC_DIR}/{SRC[v][0]}').convert('RGB'), Image.open(f'{SRC_DIR}/{SRC[v][1]}').convert('RGB')
    else: d, p = shift(base_d, HUE[v]), shift(base_p, HUE[v])
    save(d, v); save(d.resize((1280, round(d.height * 1280 / d.width)), Image.LANCZOS), f'{v}-1280'); save(p, f'{v}-phone')
    print(v, 'ok')
