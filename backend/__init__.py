import os
from flask import Flask, jsonify

def create_app() -> Flask:
    static_folder = os.path.join(os.path.dirname(__file__), "..", "frontend")
    app = Flask(__name__, static_folder=static_folder, static_url_path="")

    @app.route("/api/status")
    def status():
        return jsonify({"status": "ok", "message": "Backend API is running"})

    @app.route("/")
    def index():
        return app.send_static_file("index.html")

    return app