import threading
import queue
import traceback
from app.services.video_assembler import assemble_video

# Global render jobs tracker
render_jobs = {}
_jobs_lock = threading.Lock()


class RenderJob:
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.progress_queue = queue.Queue()
        self.status = "pending"  # pending, rendering, done, error
        self.output_path = None
        self.error = None
        self.thread = None

    def to_dict(self):
        return {
            "project_id": self.project_id,
            "status": self.status,
            "output_path": self.output_path,
            "error": self.error,
        }


def start_render(project: dict) -> RenderJob:
    project_id = project["id"]

    with _jobs_lock:
        # Cancel existing job if running
        if project_id in render_jobs:
            existing = render_jobs[project_id]
            if existing.status == "rendering":
                raise RuntimeError("Renderelés már folyamatban van!")

    job = RenderJob(project_id)
    job.status = "rendering"

    def worker():
        try:
            def progress_callback(pct, msg):
                job.progress_queue.put({"percent": pct, "message": msg})

            output_path = assemble_video(project, progress_callback)
            job.output_path = output_path
            job.status = "done"
            job.progress_queue.put({"percent": 100, "message": "Kész!", "done": True})
        except Exception as e:
            job.status = "error"
            job.error = str(e)
            job.progress_queue.put({
                "percent": -1,
                "message": f"Hiba: {e}",
                "error": True,
                "traceback": traceback.format_exc()
            })

    job.thread = threading.Thread(target=worker, daemon=True)
    with _jobs_lock:
        render_jobs[project_id] = job
    job.thread.start()
    return job


def get_render_job(project_id: str) -> RenderJob | None:
    with _jobs_lock:
        return render_jobs.get(project_id)
