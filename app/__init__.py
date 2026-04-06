from flask import Flask
from config import ensure_dirs, MAX_CONTENT_LENGTH, SECRET_KEY


def create_app():
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
    app.config["SECRET_KEY"] = SECRET_KEY

    ensure_dirs()

    from app.routes import register_blueprints
    register_blueprints(app)

    return app
