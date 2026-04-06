import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
RENDERS_DIR = DATA_DIR / "renders"
PREVIEWS_DIR = DATA_DIR / "previews"
PROJECTS_FILE = DATA_DIR / "projects.json"

# Flask config
MAX_CONTENT_LENGTH = 2 * 1024 * 1024 * 1024  # 2GB max upload
SECRET_KEY = os.environ.get("SECRET_KEY", "video-editor-dev-key-2026")

# Video defaults
DEFAULT_RESOLUTION = (1920, 1080)
DEFAULT_FPS = 24
DEFAULT_CODEC = "libx264"
DEFAULT_AUDIO_CODEC = "aac"

# Font resolution - platform aware
# Bundled fonts in static/fonts/ are used on Linux/Railway
# Windows falls back to system fonts
BUNDLED_FONTS_DIR = BASE_DIR / "app" / "static" / "fonts"

FONTS = {
    "Arial":           "DejaVuSans.ttf",
    "Arial Bold":      "DejaVuSans-Bold.ttf",
    "Times New Roman": "DejaVuSerif.ttf",
    "Courier New":     "DejaVuSansMono.ttf",
    "Georgia":         "DejaVuSerif.ttf",
    "Verdana":         "DejaVuSans.ttf",
    "Impact":          "DejaVuSans-Bold.ttf",
    "Comic Sans":      "DejaVuSans.ttf",
}

WINDOWS_FONTS = {
    "Arial":           "arial.ttf",
    "Arial Bold":      "arialbd.ttf",
    "Times New Roman": "times.ttf",
    "Courier New":     "cour.ttf",
    "Georgia":         "georgia.ttf",
    "Verdana":         "verdana.ttf",
    "Impact":          "impact.ttf",
    "Comic Sans":      "comic.ttf",
}


def get_font_path(font_name="Arial"):
    # Try bundled fonts first (cross-platform)
    bundled_name = FONTS.get(font_name, "DejaVuSans.ttf")
    bundled_path = BUNDLED_FONTS_DIR / bundled_name
    if bundled_path.exists():
        return str(bundled_path)

    # Windows system fonts fallback
    if sys.platform == "win32":
        win_name = WINDOWS_FONTS.get(font_name, "arial.ttf")
        win_path = Path("C:/Windows/Fonts") / win_name
        if win_path.exists():
            return str(win_path)

    # Linux system fonts fallback
    for linux_path in [
        f"/usr/share/fonts/truetype/dejavu/{bundled_name}",
        f"/usr/share/fonts/dejavu/{bundled_name}",
        f"/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]:
        if Path(linux_path).exists():
            return linux_path

    return bundled_name  # let MoviePy try


def ensure_dirs():
    for d in [DATA_DIR, UPLOADS_DIR, RENDERS_DIR, PREVIEWS_DIR]:
        d.mkdir(parents=True, exist_ok=True)
    if not PROJECTS_FILE.exists():
        PROJECTS_FILE.write_text("[]", encoding="utf-8")
