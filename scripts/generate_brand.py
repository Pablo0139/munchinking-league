"""Run with Python and Pillow 12.2.0; outputs only public brand assets."""

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "references" / "Logo oficial Mchk-L.png"
ICONS = ROOT / "apps/web/public/icons"


def icon(image, size):
    result = image.resize((size, size), Image.Resampling.LANCZOS)
    # The original is charcoal/white. Keep 32 evenly spaced gray levels rather
    # than spending most of an adaptive palette on noise in the dark texture.
    indices = ImageOps.grayscale(result).point(lambda v: round(v * 31 / 255))
    indices.putpalette([round(i * 255 / 31) for i in range(32) for _ in range(3)])
    return indices


def main():
    with Image.open(SOURCE) as source:
        image = source.convert("RGB")
    if image.width != image.height:
        raise ValueError("Expected the square official artwork")
    ICONS.mkdir(exist_ok=True, parents=True)
    for size in (32, 192, 512):
        icon(image, size).save(ICONS / f"league-{size}.png", optimize=True)

    # Keep the entire original square inside the central 80%-diameter circle.
    # Fill the bleed with the artwork's own left edge (background texture only).
    size = 512
    inset_size = 288  # diagonal = 407.3 px < safe diameter of 409.6 px
    bleed = ImageOps.fit(image.crop((0, 0, 240, image.height)), (size, size))
    inset = image.resize((inset_size, inset_size), Image.Resampling.LANCZOS)
    margin = (size - inset_size) // 2
    bleed.paste(inset, (margin, margin))
    icon(bleed, size).save(ICONS / "league-maskable.png", optimize=True)


if __name__ == "__main__":
    main()