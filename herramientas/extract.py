"""Recorta los sprites de la hoja de MANRAY (sheet.png) en PNG con transparencia."""
import os, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC = os.path.join(os.path.dirname(__file__), "sheet.png")
OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)

im = np.array(Image.open(SRC).convert("RGB")).astype(int)
BG = np.array([14, 21, 28])

# (nombre, x0, y0, x1, y1) — celdas sobre la hoja original de 1024x1536
CELLS = [
    # fila 1 de Keiko (las etiquetas empiezan en y≈139)
    ("idle1", 20, 38, 100, 137), ("idle2", 108, 38, 190, 137), ("idle3", 200, 38, 282, 137),
    ("tap1", 290, 36, 374, 137), ("tap2", 380, 36, 466, 137), ("tap3", 470, 36, 556, 137),
    ("happy1", 560, 36, 644, 137), ("happy2", 646, 36, 744, 137),
    ("happy3a", 750, 36, 866, 137), ("happy3", 868, 34, 990, 137),
    # fila 2 de Keiko (etiquetas en y≈273)
    ("excited1", 8, 160, 110, 272), ("excited2", 104, 160, 184, 272),
    ("angry1", 184, 160, 258, 272), ("angry2", 260, 160, 344, 272),
    ("sad1", 344, 160, 418, 272), ("sad2", 420, 160, 496, 272),
    ("phone1", 498, 160, 584, 272), ("hat1", 584, 160, 667, 272), ("hat2", 667, 160, 750, 272),
    ("president1", 750, 160, 842, 272), ("panic1", 842, 160, 914, 272), ("gameover1", 914, 160, 1016, 272),
    # personajes de interrupciones (etiquetas en y≈548)
    ("ministro", 10, 426, 104, 546), ("congreso", 106, 426, 204, 546), ("periodista", 208, 426, 296, 547),
    ("manifestantes", 300, 426, 582, 546), ("asesor", 582, 426, 666, 546), ("policia", 666, 426, 762, 547),
    ("docs_pila", 762, 426, 842, 546), ("docs_caja", 842, 426, 910, 546), ("docs_urgente", 910, 426, 1010, 547),
]
BACKS = [
    ("bg_despacho", 9, 601, 393, 773), ("bg_palacio", 404, 601, 612, 773),
    ("bg_protesta", 624, 601, 812, 773), ("bg_emergencia", 822, 601, 1013, 773),
]

meta = {}
for name, x0, y0, x1, y1 in CELLS:
    crop = im[y0:y1, x0:x1]
    d = np.abs(crop - BG).sum(2)
    bgmask = d <= 9
    lab, n = nd.label(bgmask)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    trans = np.isin(lab, list(border))
    # huecos interiores del color exacto del fondo (entre brazos y cuerpo)
    for i, sl in enumerate(nd.find_objects(lab)):
        if i + 1 in border or sl is None:
            continue
        region = lab[sl] == i + 1
        if region.sum() >= 12 and (d[sl][region] <= 4).mean() > 0.9:
            trans[sl] |= region
    alpha = np.where(trans, 0, 255).astype(np.uint8)
    # quita motas sueltas pequeñas (restos de etiquetas o ruido)
    solid = alpha > 0
    lab2, n2 = nd.label(solid)
    sizes = nd.sum(solid, lab2, range(1, n2 + 1))
    big = sizes.max()
    H_, W_ = alpha.shape
    for i, (s, sl) in enumerate(zip(sizes, nd.find_objects(lab2))):
        ys_, xs_ = sl
        edge = xs_.start <= 1 or xs_.stop >= W_ - 1
        thin = (ys_.stop - ys_.start) <= 4 or (xs_.stop - xs_.start) <= 3
        if s < 6 or (edge and s < 0.2 * big) or (thin and s < 0.05 * big):
            alpha[lab2 == i + 1] = 0
    rgba = np.dstack([crop.astype(np.uint8), alpha])
    ys, xs = np.where(alpha > 0)
    rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(rgba, "RGBA").save(os.path.join(OUT, name + ".png"))
    meta[name] = [int(rgba.shape[1]), int(rgba.shape[0])]

for name, x0, y0, x1, y1 in BACKS:
    Image.fromarray(im[y0:y1, x0:x1].astype(np.uint8), "RGB").save(os.path.join(OUT, name + ".png"))
    meta[name] = [x1 - x0, y1 - y0]

json.dump(meta, open(os.path.join(OUT, "meta.json"), "w"), indent=1)
print(json.dumps(meta))
