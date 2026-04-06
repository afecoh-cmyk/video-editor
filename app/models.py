import json
import uuid
import threading
from dataclasses import dataclass, field, asdict
from config import PROJECTS_FILE

_lock = threading.Lock()


@dataclass
class TextOverlay:
    text: str = ""
    font_name: str = "Arial"
    font_size: int = 48
    color: str = "white"
    bg_color: str = ""
    position: str = "center"  # center, top, bottom, top-left, etc.
    fade_in: float = 0.5
    fade_out: float = 0.5


@dataclass
class ClipAssignment:
    asset_id: str = ""
    clip_start: float = 0.0  # start time within the source clip
    clip_end: float = 0.0    # end time within the source clip


@dataclass
class AudioTrack:
    asset_id: str = ""
    role: str = "music"  # music, narration, sfx
    volume: float = 1.0
    start_offset: float = 0.0
    fade_in: float = 0.0
    fade_out: float = 0.0
    loop: bool = False


@dataclass
class Segment:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    order: int = 0
    label: str = ""
    duration: float = 5.0  # desired segment duration in seconds
    clip: dict = field(default_factory=dict)  # {asset_id, clip_start, clip_end}
    text_overlay: dict = field(default_factory=dict)
    transition_in: str = "cut"  # cut, fade, crossfade
    transition_duration: float = 0.5
    mute_original_audio: bool = False


@dataclass
class Asset:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    filename: str = ""
    original_name: str = ""
    file_type: str = "video"  # video, audio, image
    duration: float = 0.0
    width: int = 0
    height: int = 0
    fps: float = 0.0
    path: str = ""


@dataclass
class Project:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = "Új projekt"
    resolution: list = field(default_factory=lambda: [1920, 1080])
    fps: int = 24
    segments: list = field(default_factory=list)
    audio_tracks: list = field(default_factory=list)
    assets: list = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""


def _load_all() -> list[dict]:
    with _lock:
        try:
            data = PROJECTS_FILE.read_text(encoding="utf-8")
            return json.loads(data) if data.strip() else []
        except (json.JSONDecodeError, FileNotFoundError):
            return []


def _save_all(projects: list[dict]):
    with _lock:
        PROJECTS_FILE.write_text(
            json.dumps(projects, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )


def get_all_projects() -> list[dict]:
    return _load_all()


def get_project(project_id: str) -> dict | None:
    for p in _load_all():
        if p["id"] == project_id:
            return p
    return None


def save_project(project: dict):
    projects = _load_all()
    for i, p in enumerate(projects):
        if p["id"] == project["id"]:
            projects[i] = project
            _save_all(projects)
            return
    projects.append(project)
    _save_all(projects)


def delete_project(project_id: str):
    projects = [p for p in _load_all() if p["id"] != project_id]
    _save_all(projects)
