from flask import Blueprint, request, jsonify
from zai import ZhipuAiClient
from app.config import Config

chat_bp = Blueprint('chat', __name__, url_prefix='/api')

client = ZhipuAiClient(api_key=Config.ZHIPU_API_KEY)

@chat_bp.route("/chat", methods=["POST"])
def chat():
    try:
        # 获取前端发送的请求数据
        data = request.get_json()
        if not data or "messages" not in data:
            return jsonify({"error": "缺少消息数据"}), 400

        response = client.chat.completions.create(
            model="glm-3-turbo",
            messages=data["messages"],
            temperature=data.get("temperature", 0.5),
            max_tokens=data.get("max_tokens", 500)
        )

        print("大模型原始响应：", response)
        print("AI回复内容：", response.choices[0].message.content)

        return jsonify({
            "response": response.choices[0].message.content
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500