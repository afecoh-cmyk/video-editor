from moviepy import AudioFileClip, CompositeAudioClip, afx, AudioClip
import numpy as np
from config import UPLOADS_DIR


def mix_audio(project: dict, video_duration: float, video_audio=None) -> AudioClip | None:
    """
    Mix audio tracks (narration, music, sfx) with optional original video audio.
    Returns a CompositeAudioClip or None if no audio.
    """
    audio_layers = []

    # Include original video audio if present
    if video_audio is not None:
        audio_layers.append(video_audio)

    # Process each audio track from the project
    for track in project.get("audio_tracks", []):
        asset = _find_asset(project, track.get("asset_id"))
        if not asset:
            continue

        audio_path = asset["path"]
        try:
            audio_clip = AudioFileClip(audio_path)
        except Exception:
            continue

        volume = track.get("volume", 1.0)
        start_offset = track.get("start_offset", 0.0)
        fade_in = track.get("fade_in", 0.0)
        fade_out = track.get("fade_out", 0.0)
        loop = track.get("loop", False)

        # Loop if needed (for background music)
        if loop and audio_clip.duration < video_duration:
            repeats = int(np.ceil(video_duration / audio_clip.duration))
            from moviepy import concatenate_audioclips
            audio_clip = concatenate_audioclips([audio_clip] * repeats)
            audio_clip = audio_clip.subclipped(0, video_duration)

        # Trim to fit within video duration
        max_duration = video_duration - start_offset
        if audio_clip.duration > max_duration:
            audio_clip = audio_clip.subclipped(0, max_duration)

        # Apply volume
        if volume != 1.0:
            audio_clip = audio_clip.with_volume_scaled(volume)

        # Apply fades
        effects = []
        if fade_in > 0:
            effects.append(afx.AudioFadeIn(fade_in))
        if fade_out > 0:
            effects.append(afx.AudioFadeOut(fade_out))
        if effects:
            audio_clip = audio_clip.with_effects(effects)

        # Set start position
        if start_offset > 0:
            audio_clip = audio_clip.with_start(start_offset)

        audio_layers.append(audio_clip)

    if not audio_layers:
        return None

    if len(audio_layers) == 1:
        return audio_layers[0]

    return CompositeAudioClip(audio_layers)


def _find_asset(project: dict, asset_id: str) -> dict | None:
    if not asset_id:
        return None
    for a in project.get("assets", []):
        if a["id"] == asset_id:
            return a
    return None
