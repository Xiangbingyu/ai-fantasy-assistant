from flask import Flask, jsonify, request

def create_app() -> Flask:
    app = Flask(__name__)

    @app.route("/")
    def root():
        return jsonify({"status": "ok", "message": "Flask backend is running"})
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="127.0.0.1", port=5000, debug=True)