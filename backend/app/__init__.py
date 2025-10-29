from flask import Flask, jsonify

def create_app() -> Flask:
    app = Flask(__name__)

    @app.route("/api/status", methods=["GET"])
    def status():
        return jsonify(ok=True)

    return app