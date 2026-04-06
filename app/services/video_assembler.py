import os
from moviepy import (
    VideoFileClip, ImageClip, ColorClip,
    CompositeVideoClip, concatenate_videoclips
)
from config import RENDERS_DIR, DEFAULT_CODEC, DEFAULT_AUDIO_CODEC
from app.services.text_overlay import apply_text_overlay
from app.services.transitions import apply_transition
from app.services.audio_mixer import mix_audio


def assemble_video(project: dict, progress_callback=None):
    """
    Assemble the final video from a project's storyboard.
    progress_callback(percent, message) is called to report progress.
    Returns the output file path.
    """
    project_id = project["id"]
    segments = sorted(project.get("segments", []), key=lambda s: s.get("order", 0))
    resolution = tuple(project.get("resolution", [1920, 1080]))
    fps = project.get("fps", 24)

    if not segments:
        raise ValueError("Nincsenek szegmensek a storyboardban!")

    def report(pct, msg):
        if progress_callback:
            progress_callback(pct, msg)

    report(0, "Videó összeállítás indítása...")

    clips = []
    transitions = []
    opened_clips = []  # Track for cleanup

    try:
        total = len(segments)
        for i, seg in enumerate(segments):
            report(int((i / total) * 60), f"Szegmens feldolgozása: {i+1}/{total} - {seg.get('label', '')}")

            clip = _build_segment_clip(project, seg, resolution, fps)
            opened_clips.append(clip)

            # Apply text overlay if configured
            text_config = seg.get("text_overlay", {})
            if text_config and text_config.get("text"):
                clip = apply_text_overlay(clip, text_config)

            clips.append(clip)

            # Collect transition info (for junction between this and next segment)
            if i < total - 1:
                transitions.append({
                    "type": seg.get("transition_in", "cut"),
                    "duration": seg.get("transition_duration", 0.5),
                })

        report(60, "Szegmensek összefűzése átmenetekkel...")
        assembled = apply_transition(clips, transitions)

        report(70, "Hang keverése...")
        video_audio = assembled.audio if not all(
            s.get("mute_original_audio", False) for s in segments
        ) else None
        mixed_audio = mix_audio(project, assembled.duration, video_audio)
        if mixed_audio is not None:
            assembled = assembled.with_audio(mixed_audio)

        report(80, "Végső videó renderelése...")
        output_dir = RENDERS_DIR / project_id
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = str(output_dir / f"{project.get('name', 'output')}.mp4")

        assembled.write_videofile(
            output_path,
            fps=fps,
            codec=DEFAULT_CODEC,
            audio_codec=DEFAULT_AUDIO_CODEC,
            preset="medium",
            threads=4,
            logger=None,
        )

        report(100, "Kész! Videó sikeresen elkészült.")
        return output_path

    finally:
        # Cleanup all opened clips
        for c in opened_clips:
            try:
                c.close()
            except Exception:
                pass


def _build_segment_clip(project: dict, segment: dict, resolution: tuple, fps: int):
    """Build a single segment clip from its clip assignment."""
    clip_info = segment.get("clip", {})
    duration = segment.get("duration", 5.0)
    asset_id = clip_info.get("asset_id", "")

    if asset_id:
        asset = _find_asset(project, asset_id)
        if asset and os.path.exists(asset["path"]):
            source = VideoFileClip(asset["path"])
            clip_start = clip_info.get("clip_start", 0.0)
            clip_end = clip_info.get("clip_end", 0.0)

            # Subclip to desired range
            if clip_end > clip_start:
                source = source.subclipped(clip_start, min(clip_end, source.duration))
            elif duration < source.duration:
                source = source.subclipped(0, duration)

            # Resize to match project resolution
            source = source.resized(resolution)
            return source

    # Fallback: black clip if no video assigned
    return ColorClip(size=resolution, color=(0, 0, 0), duration=duration).with_fps(fps)


def _find_asset(project: dict, asset_id: str) -> dict | None:
    for a in project.get("assets", []):
        if a["id"] == asset_id:
            return a
    return None
