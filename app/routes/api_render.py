import json
import time
from flask import Blueprint, request, jsonify, Response, send_file
from app.models import get_project
from app.services.render_worker import start_render, get_render_job

api_render_bp = Blueprint("api_render", __name__)


@api_render_bp.route("/projects/<project_id>/render", methods=["POST"])
def start_render_route(project_id):
    project = get_project(project_id)
    if not project:
        return jsonify({"error": "Projekt nem található"}), 404

    if not project.get("segments"):
        return jsonify({"error": "Nincsenek szegmensek!"}), 400

    try:
        job = start_render(project)
        return jsonify({"status": "started", "project_id": project_id})
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 409


@api_render_bp.route("/projects/<project_id>/render/progress")
def render_progress(project_id):
    """Server-Sent Events endpoint for render progress."""
    def generate():
        job = get_render_job(project_id)
        if not job:
            yield f"data: {json.dumps({'error': 'Nincs aktív renderelés'})}\n\n"
            return

        while True:
            try:
                msg = job.progress_queue.get(timeout=1.0)
                yield f"data: {json.dumps(msg, ensure_ascii=False)}\n\n"
                if msg.get("done") or msg.get("error"):
                    break
            except Exception:
                # Queue timeout - send heartbeat
                if job.status in ("done", "error"):
                    final = {
                        "percent": 100 if job.status == "done" else -1,
                        "message": "Kész!" if job.status == "done" else job.error,
                        "done": job.status == "done",
                        "error": job.status == "error",
                    }
                    yield f"data: {json.dumps(final, ensure_ascii=False)}\n\n"
                    break
                yield f"data: {json.dumps({'heartbeat': True})}\n\n"

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api_render_bp.route("/projects/<project_id>/render/status")
def render_status(project_id):
    job = get_render_job(project_id)
    if not job:
        return jsonify({"status": "idle"})
    return jsonify(job.to_dict())


@api_render_bp.route("/projects/<project_id>/render/download")
def download_render(project_id):
    job = get_render_job(project_id)
    if not job or job.status != "done" or not job.output_path:
        return jsonify({"error": "Nincs kész videó"}), 404
    return send_file(job.output_path, as_attachment=True)
