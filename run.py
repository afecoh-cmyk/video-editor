import sys
import os

# Ensure the project root is on the path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app

app = create_app()

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5050))
    debug = os.environ.get("FLASK_ENV") != "production"
    app.run(host="0.0.0.0", port=port, debug=debug, threaded=True)
