"""
Normalises the tier medal artwork.

The three source PNGs are drawn on the same canvas but with different padding —
bronze filled 84% of its frame where gold and platinum fill 68% — so rendering
them at one size made bronze look larger. This crops each coin to its opaque
bounds and re-centres it so all three share the same visual diameter.

Run with: python3 scripts/normalize-tier-medals.py
"""

import pathlib
from PIL import Image

CANVAS = 512
# Diameter the coin occupies inside the canvas — gold/platinum's original ratio.
TARGET = 346

source_dir = pathlib.Path(__file__).resolve().parents[2]
out_dir = pathlib.Path(__file__).resolve().parents[1] / "assets" / "tiers"
out_dir.mkdir(parents=True, exist_ok=True)

for name in ("bronze", "gold", "platinum"):
    image = Image.open(source_dir / f"{name}.png").convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    coin = image.crop(bbox)

    scale = TARGET / max(coin.size)
    size = (round(coin.width * scale), round(coin.height * scale))
    coin = coin.resize(size, Image.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(coin, ((CANVAS - size[0]) // 2, (CANVAS - size[1]) // 2), coin)
    canvas.save(out_dir / f"{name}.png")
    print(f"{name}: {bbox} -> {size} centred on {CANVAS}x{CANVAS}")
