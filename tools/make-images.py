#!/usr/bin/env python3
"""Make the smaller WebP copies of a plugin screenshot.

The site does not need this to run. Use it when you add or swap a
screenshot in assets/plugins.

    pip3 install pillow
    python3 tools/make-images.py assets/plugins/fizz-ui.png

It writes fizz-ui-360.webp, fizz-ui-720.webp, and fizz-ui-1080.webp
next to the PNG (only sizes smaller than the PNG, plus the PNG's own
width when it is under 1080), then prints the lines to paste into
products.js.

The pictures are resized and re-encoded only. Nothing is redrawn.
WebP quality is 85. Add --lossless for a screenshot whose small
knob text looks soft at 85 (compare the files side by side).
"""

import argparse
import os
import sys

from PIL import Image

WIDTHS = (360, 720, 1080)


def opaque_rgb(image):
    """Drop an alpha channel that is fully opaque. Pixels stay the same."""
    if image.mode == "RGBA" and image.getextrema()[3] == (255, 255):
        return image.convert("RGB")
    if image.mode not in ("RGB", "RGBA"):
        return image.convert("RGBA" if "A" in image.getbands() else "RGB")
    return image


def make(path, lossless):
    image = opaque_rgb(Image.open(path))
    width, height = image.size
    base, _ = os.path.splitext(path)
    widths = [w for w in WIDTHS if w < width]
    if width <= WIDTHS[-1]:
        widths.append(width)
    for w in widths:
        copy = image if w == width else image.resize((w, round(height * w / width)), Image.LANCZOS)
        out = "%s-%d.webp" % (base, w)
        if lossless:
            copy.save(out, "WEBP", lossless=True, quality=100, method=6)
        else:
            copy.save(out, "WEBP", quality=85, method=6)
        print("  wrote %s (%d KB)" % (out, os.path.getsize(out) // 1024))
    print()
    print("Paste into products.js:")
    print('    screenshot: "%s",' % path.replace(os.sep, "/"))
    print("    shotWidth: %d," % width)
    print("    shotHeight: %d," % height)
    print("    shotSizes: [%s]," % ", ".join(str(w) for w in widths))


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("png", nargs="+", help="screenshot PNG in assets/plugins")
    parser.add_argument("--lossless", action="store_true", help="lossless WebP instead of quality 85")
    args = parser.parse_args()
    for path in args.png:
        if not os.path.isfile(path):
            sys.exit("Not found: " + path)
        print(path)
        make(path, args.lossless)
        print()


if __name__ == "__main__":
    main()
