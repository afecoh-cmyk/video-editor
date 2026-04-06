import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from app.models import get_project, save_project

api_storyboard_bp = Blueprint("api_storyboard", __name__)


@api_storyboard_bp.route("/projects/<project_id>/segments", methods=["GET"])
def list_segments(project_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404
    segments = sorted(project.get("segments", []), key=lambda s: s.get("order", 0))
    return jsonify(segments)


@api_storyboard_bp.route("/projects/<project_id>/segments", methods=["POST"])
def add_segment(project_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404

    data = request.get_json() or {}
    segments = project.get("segments", [])
    max_order = max((s.get("order", 0) for s in segments), default=-1) + 1

    segment = {
        "id": str(uuid.uuid4())[:8],
        "order": data.get("order", max_order),
        "label": data.get("label", f"Szegmens {max_order + 1}"),
        "duration": data.get("duration", 5.0),
        "clip": data.get("clip", {}),
        "text_overlay": data.get("text_overlay", {}),
        "transition_in": data.get("transition_in", "cut"),
        "transition_duration": data.get("transition_duration", 0.5),
        "mute_original_audio": data.get("mute_original_audio", False),
    }

    segments.append(segment)
    project["segments"] = segments
    project["updated_at"] = datetime.now().isoformat()
    save_project(project)

    return jsonify(segment), 201


@api_storyboard_bp.route("/projects/<project_id>/segments/<segment_id>", methods=["PUT"])
def update_segment(project_id, segment_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404

    data = request.get_json() or {}
    segments = project.get("segments", [])

    for i, seg in enumerate(segments):
        if seg["id"] == segment_id:
            for key in ["label", "duration", "clip", "text_overlay",
                        "transition_in", "transition_duration", "order",
                        "mute_original_audio"]:
                if key in data:
                    segments[i][key] = data[key]
            project["segments"] = segments
            project["updated_at"] = datetime.now().isoformat()
            save_project(project)
            return jsonify(segments[i])

    return jsonify({"error": "Szegmens nem található"}), 404


@api_storyboard_bp.route("/projects/<project_id>/segments/<segment_id>", methods=["DELETE"])
def delete_segment(project_id, segment_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404

    project["segments"] = [s for s in project.get("segments", []) if s["id"] != segment_id]
    # Re-order remaining segments
    for i, seg in enumerate(sorted(project["segments"], key=lambda s: s.get("order", 0))):
        seg["order"] = i
    project["updated_at"] = datetime.now().isoformat()
    save_project(project)
    return jsonify({"ok": True})


@api_storyboard_bp.route("/projects/<project_id>/segments/reorder", methods=["POST"])
def reorder_segments(project_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404

    data = request.get_json() or {}
    order_list = data.get("order", [])  # list of segment IDs in new order

    seg_map = {s["id"]: s for s in project.get("segments", [])}
    for i, seg_id in enumerate(order_list):
        if seg_id in seg_map:
            seg_map[seg_id]["order"] = i

    project["segments"] = list(seg_map.values())
    project["updated_at"] = datetime.now().isoformat()
    save_project(project)
    return jsonify(project["segments"])


@api_storyboard_bp.route("/projects/<project_id>/audio_tracks", methods=["GET"])
def list_audio_tracks(project_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404
    return jsonify(project.get("audio_tracks", []))


@api_storyboard_bp.route("/projects/<project_id>/audio_tracks", methods=["POST"])
def add_audio_track(project_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404

    data = request.get_json() or {}
    track = {
        "id": str(uuid.uuid4())[:8],
        "asset_id": data.get("asset_id", ""),
        "role": data.get("role", "music"),
        "volume": data.get("volume", 1.0),
        "start_offset": data.get("start_offset", 0.0),
        "fade_in": data.get("fade_in", 0.0),
        "fade_out": data.get("fade_out", 0.0),
        "loop": data.get("loop", False),
    }

    project.setdefault("audio_tracks", []).append(track)
    project["updated_at"] = datetime.now().isoformat()
    save_project(project)
    return jsonify(track), 201


@api_storyboard_bp.route("/projects/<project_id>/audio_tracks/<track_id>", methods=["PUT"])
def update_audio_track(project_id, track_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404

    data = request.get_json() or {}
    for track in project.get("audio_tracks", []):
        if track["id"] == track_id:
            for key in ["asset_id", "role", "volume", "start_offset", "fade_in", "fade_out", "loop"]:
                if key in data:
                    track[key] = data[key]
            project["updated_at"] = datetime.now().isoformat()
            save_project(project)
            return jsonify(track)

    return jsonify({"error": "Hangsáv nem található"}), 404


@api_storyboard_bp.route("/projects/<project_id>/audio_tracks/<track_id>", methods=["DELETE"])
def delete_audio_track(project_id, track_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404

    project["audio_tracks"] = [t for t in project.get("audio_tracks", []) if t["id"] != track_id]
    project["updated_at"] = datetime.now().isoformat()
    save_project(project)
    return jsonify({"ok": True})
