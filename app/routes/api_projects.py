import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from app.models import get_all_projects, get_project, save_project, delete_project
from config import UPLOADS_DIR, RENDERS_DIR, PREVIEWS_DIR
import shutil

api_projects_bp = Blueprint("api_projects", __name__)


@api_projects_bp.route("/projects", methods=["GET"])
def list_projects():
    return jsonify(get_all_projects())


@api_projects_bp.route("/projects", methods=["POST"])
def create_project():
    data = request.get_json() or {}
    now = datetime.now().isoformat()
    project = {
        "id": str(uuid.uuid4())[:8],
        "name": data.get("name", "Új projekt"),
        "resolution": data.get("resolution", [1920, 1080]),
        "fps": data.get("fps", 24),
        "segments": [],
        "audio_tracks": [],
        "assets": [],
        "created_at": now,
        "updated_at": now,
    }
    save_project(project)

    # Create upload dirs
    (UPLOADS_DIR / project["id"] / "video").mkdir(parents=True, exist_ok=True)
    (UPLOADS_DIR / project["id"] / "audio").mkdir(parents=True, exist_ok=True)

    return jsonify(project), 201


@api_projects_bp.route("/projects/<project_id>", methods=["GET"])
def get_project_detail(project_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404
    return jsonify(project)


@api_projects_bp.route("/projects/<project_id>", methods=["PUT"])
def update_project(project_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404

    data = request.get_json() or {}
    for key in ["name", "resolution", "fps"]:
        if key in data:
            project[key] = data[key]
    project["updated_at"] = datetime.now().isoformat()
    save_project(project)
    return jsonify(project)


@api_projects_bp.route("/projects/<project_id>", methods=["DELETE"])
def delete_project_route(project_id):
    delete_project(project_id)
    # Cleanup files
    for d in [UPLOADS_DIR / project_id, RENDERS_DIR / project_id, PREVIEWS_DIR / project_id]:
        if d.exists():
            shutil.rmtree(d, ignore_errors=True)
    return jsonify({"ok": True})
