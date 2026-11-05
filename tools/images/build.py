#!/usr/bin/env python3
"""
Resizes the site's images, because a static export can't resize them on request.

    python3 tools/images/build.py      (needs Pillow)

Writes public/img/<name>-<width>.webp and lib/image-manifest.json. lib/image-loader.ts reads the
manifest, so next/image can offer real srcsets. Run it again after adding or changing an image.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
OUT = PUBLIC / "img"
# Keep in step with images.deviceSizes and images.imageSizes in next.config.mjs.
WIDTHS = [96, 256, 384, 640, 828, 1080, 1440, 1920]
SOURCES = ["projects/*.webp", "case-studies/**/*.jpg", "hero-cutout.webp", "brands/*.png", "logo-mark.png", "reel/kasif-reel-thumb.jpg"]


def build():
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob("*.webp"):
        old.unlink()
    manifest = {}
    total_in = total_out = 0
    for pattern in SOURCES:
        for path in sorted(PUBLIC.glob(pattern)):
            image = Image.open(path)
            has_alpha = image.mode in ("RGBA", "LA", "P")
            image = image.convert("RGBA" if has_alpha else "RGB")
            stem = "-".join(path.relative_to(PUBLIC).with_suffix("").parts)
            made = []
            for width in WIDTHS:
                if width >= image.width:
                    break
                height = round(image.height * width / image.width)
                resized = image.resize((width, height), Image.LANCZOS)
                target = OUT / f"{stem}-{width}.webp"
                # Logos and cutouts have hard edges on transparency, so they get a little more quality.
                resized.save(target, "WEBP", quality=88 if has_alpha else 76, method=6)
                total_out += target.stat().st_size
                made.append(width)
            if made:
                manifest[f"/{path.relative_to(PUBLIC).as_posix()}"] = {"name": stem, "widths": made}
            total_in += path.stat().st_size
    (ROOT / "lib" / "image-manifest.json").write_text(json.dumps(manifest, indent=0, sort_keys=True) + "\n")
    print(f"{len(manifest)} images, originals {total_in // 1024} KB, all variants {total_out // 1024} KB")


if __name__ == "__main__":
    build()
