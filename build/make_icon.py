"""Build app icon assets from build/icon-source.png."""
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "icon-source.png"
PNG = ROOT / "icon.png"
ICO = ROOT / "icon.ico"
ICNS = ROOT / "icon.icns"


def main():
    icon = Image.open(SOURCE).convert("RGBA").resize((1024, 1024), Image.Resampling.LANCZOS)
    icon.save(PNG)
    icon.save(ICO, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    icon.save(ICNS, sizes=[(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)])
    print(f"wrote {PNG.name}, {ICO.name}, {ICNS.name}")


if __name__ == "__main__":
    main()
