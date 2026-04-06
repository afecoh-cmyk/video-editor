def register_blueprints(app):
    from app.routes.main import main_bp
    from app.routes.api_projects import api_projects_bp
    from app.routes.api_assets import api_assets_bp
    from app.routes.api_storyboard import api_storyboard_bp
    from app.routes.api_render import api_render_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(api_projects_bp, url_prefix="/api")
    app.register_blueprint(api_assets_bp, url_prefix="/api")
    app.register_blueprint(api_storyboard_bp, url_prefix="/api")
    app.register_blueprint(api_render_bp, url_prefix="/api")
