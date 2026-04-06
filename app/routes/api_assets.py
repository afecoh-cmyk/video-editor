import uuid
import os
from flask import Blueprint, request, jsonify, send_file
from app.models import get_project, save_project
from config import UPLOADS_DIR

api_assets_bp = Blueprint("api_assets", __name__)

ALLOWED_VIDEO = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".wmv", ".flv"}
ALLOWED_AUDIO = {".mp3", ".wav", ".aac", ".ogg", ".m4a", ".flac"}


@api_assets_bp.route("/projects/<project_id>/assets", methods=["GET"])
def list_assets(project_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404
    return jsonify(project.get("assets", []))


@api_assets_bp.route("/projects/<project_id>/assets/upload", methods=["POST"])
def upload_asset(project_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404

    if "file" not in request.files:
        return jsonify({"error": "Nincs fájl"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Üres fájlnév"}), 400

    ext = os.path.splitext(file.filename)[1].lower()

    if ext in ALLOWED_VIDEO:
        file_type = "video"
        subdir = "video"
    elif ext in ALLOWED_AUDIO:
        file_type = "audio"
        subdir = "audio"
    else:
        return jsonify({"error": f"Nem támogatott formátum: {ext}"}), 400

    asset_id = str(uuid.uuid4())[:8]
    filename = f"{asset_id}{ext}"
    save_dir = UPLOADS_DIR / project_id / subdir
    save_dir.mkdir(parents=True, exist_ok=True)
    filepath = save_dir / filename
    file.save(str(filepath))

    # Extract metadata
    metadata = _probe_media(str(filepath), file_type)

    asset = {
        "id": asset_id,
        "filename": filename,
        "original_name": file.filename,
        "file_type": file_type,
        "duration": metadata.get("duration", 0),
        "width": metadata.get("width", 0),
        "height": metadata.get("height", 0),
        "fps": metadata.get("fps", 0),
        "path": str(filepath).replace("\\", "/"),
    }

    project.setdefault("assets", []).append(asset)
    save_project(project)

    return jsonify(asset), 201


@api_assets_bp.route("/projects/<project_id>/assets/<asset_id>", methods=["DELETE"])
def delete_asset(project_id, asset_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404

    asset = None
    for a in project.get("assets", []):
        if a["id"] == asset_id:
            asset = a
            break

    if not asset:
        return jsonify({"error": "Fájl nem található"}), 404

    # Delete file
    try:
        os.remove(asset["path"])
    except OSError:
        pass

    project["assets"] = [a for a in project["assets"] if a["id"] != asset_id]
    save_project(project)
    return jsonify({"ok": True})


@api_assets_bp.route("/projects/<project_id>/assets/<asset_id>/serve")
def serve_asset(project_id, asset_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404

    for a in project.get("assets", []):
        if a["id"] == asset_id:
            return send_file(a["path"])

    return jsonify({"error": "Fájl nem található"}), 404


def _probe_media(filepath: str, file_type: str) -> dict:
    """Extract duration/resolution from media file."""
    try:
        if file_type == "video":
            from moviepy import VideoFileClip
            clip = VideoFileClip(filepath)
            info = {
                "duration": round(clip.duration, 2),
                "width": clip.size[0],
                "height": clip.size[1],
                "fps": round(clip.fps, 2),
            }
            clip.close()
            return info
        elif file_type == "audio":
            from moviepy import AudioFileClip
            clip = AudioFileClip(filepath)
            info = {"duration": round(clip.duration, 2)}
            clip.close()
            return info
    except Exception:
        pass
    return {}
