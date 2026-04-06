from moviepy import TextClip, CompositeVideoClip, VideoClip
from config import get_font_path

POSITION_MAP = {
    "center": ("center", "center"),
    "top": ("center", "top"),
    "bottom": ("center", "bottom"),
    "top-left": ("left", "top"),
    "top-right": ("right", "top"),
    "bottom-left": ("left", "bottom"),
    "bottom-right": ("right", "bottom"),
}


def create_text_clip(overlay_config: dict, duration: float) -> TextClip | None:
    if not overlay_config or not overlay_config.get("text"):
        return None

    text = overlay_config["text"]
    font_name = overlay_config.get("font_name", "Arial")
    font_size = overlay_config.get("font_size", 48)
    color = overlay_config.get("color", "white")
    bg_color = overlay_config.get("bg_color", "")
    position = overlay_config.get("position", "center")

    font_path = get_font_path(font_name)
    pos = POSITION_MAP.get(position, ("center", "center"))

    kwargs = {
        "text": text,
        "font": font_path,
        "font_size": font_size,
        "color": color,
        "text_align": "center",
        "size": (None, None),
    }

    if bg_color:
        kwargs["bg_color"] = bg_color

    txt_clip = TextClip(**kwargs)
    txt_clip = txt_clip.with_duration(duration).with_position(pos)

    # Apply fade effects
    from moviepy import vfx
    fade_in = overlay_config.get("fade_in", 0.5)
    fade_out = overlay_config.get("fade_out", 0.5)
    effects = []
    if fade_in > 0:
        effects.append(vfx.CrossFadeIn(fade_in))
    if fade_out > 0:
        effects.append(vfx.CrossFadeOut(fade_out))
    if effects:
        txt_clip = txt_clip.with_effects(effects)

    return txt_clip


def apply_text_overlay(video_clip: VideoClip, overlay_config: dict) -> VideoClip:
    txt_clip = create_text_clip(overlay_config, video_clip.duration)
    if txt_clip is None:
        return video_clip
    return CompositeVideoClip([video_clip, txt_clip])
