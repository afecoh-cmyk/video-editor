from moviepy import VideoClip, CompositeVideoClip, concatenate_videoclips, vfx


def apply_transition(clips: list[VideoClip], transitions: list[dict]) -> VideoClip:
    """
    Assemble a list of video clips with transitions between them.

    transitions: list of dicts with keys:
        - type: "cut" | "fade" | "crossfade"
        - duration: float (seconds)
    len(transitions) should be len(clips) - 1, one for each junction.
    If fewer transitions given, "cut" is used for the rest.
    """
    if not clips:
        raise ValueError("No clips to assemble")
    if len(clips) == 1:
        return clips[0]

    # Pad transitions list
    while len(transitions) < len(clips) - 1:
        transitions.append({"type": "cut", "duration": 0})

    # Check if any crossfade transitions exist
    has_crossfade = any(t["type"] == "crossfade" for t in transitions)

    if not has_crossfade:
        # Simple concatenation with fade effects
        processed = []
        for i, clip in enumerate(clips):
            effects = []

            # Fade out at end (transition to next clip)
            if i < len(clips) - 1:
                t = transitions[i]
                if t["type"] == "fade" and t.get("duration", 0) > 0:
                    effects.append(vfx.CrossFadeOut(t["duration"]))

            # Fade in at start (transition from previous clip)
            if i > 0:
                t = transitions[i - 1]
                if t["type"] == "fade" and t.get("duration", 0) > 0:
                    effects.append(vfx.CrossFadeIn(t["duration"]))

            if effects:
                clip = clip.with_effects(effects)
            processed.append(clip)

        return concatenate_videoclips(processed, method="compose")
    else:
        # Crossfade: use CompositeVideoClip with overlapping start times
        current_time = 0.0
        timed_clips = []

        for i, clip in enumerate(clips):
            effects = []

            # Crossfade in from previous
            if i > 0:
                t = transitions[i - 1]
                if t["type"] == "crossfade" and t.get("duration", 0) > 0:
                    effects.append(vfx.CrossFadeIn(t["duration"]))
                elif t["type"] == "fade" and t.get("duration", 0) > 0:
                    effects.append(vfx.CrossFadeIn(t["duration"]))

            # Crossfade out to next
            if i < len(clips) - 1:
                t = transitions[i]
                if t["type"] == "crossfade" and t.get("duration", 0) > 0:
                    effects.append(vfx.CrossFadeOut(t["duration"]))
                elif t["type"] == "fade" and t.get("duration", 0) > 0:
                    effects.append(vfx.CrossFadeOut(t["duration"]))

            if effects:
                clip = clip.with_effects(effects)

            clip = clip.with_start(current_time)
            timed_clips.append(clip)

            # Calculate next start time
            if i < len(clips) - 1:
                t = transitions[i]
                overlap = t.get("duration", 0) if t["type"] == "crossfade" else 0
                current_time += clip.duration - overlap

        total_duration = current_time + clips[-1].duration
        return CompositeVideoClip(timed_clips, size=clips[0].size).with_duration(total_duration)
