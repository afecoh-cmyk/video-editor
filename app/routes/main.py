from flask import Blueprint, render_template, redirect, url_for

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    return render_template("index.html")


@main_bp.route("/editor/<project_id>")
def editor(project_id):
    from app.models import get_project
    project = get_project(project_id)
    if not project:
        return redirect(url_for("main.index"))
    return render_template("editor.html", project=project)
