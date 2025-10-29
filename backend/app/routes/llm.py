from flask import Blueprint, request, jsonify
from zai import ZhipuAiClient
from app.config import Config

llm_bp = Blueprint('llm', __name__, url_prefix='/api')

client = ZhipuAiClient(api_key=Config.ZHIPU_API_KEY)

@llm_bp.route("/chat", methods=["POST"])
def chat():
    try:
        # 获取前端发送的请求数据
        data = request.get_json()
        if not data or "messages" not in data:
            return jsonify({"error": "缺少消息数据"}), 400

        response = client.chat.completions.create(
            model="glm-3-turbo",
            messages=data["messages"],
            temperature=0.5,
            max_tokens=500
        )

        print("大模型原始响应：", response)
        print("AI回复内容：", response.choices[0].message.content)

        return jsonify({
            "response": response.choices[0].message.content
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@llm_bp.route("/novel", methods=["POST"])
def generate_novel():
    try:
        # 获取前端传递的参数
        data = request.get_json()
        if not data or "prompt" not in data:
            return jsonify({"error": "缺少小说生成提示信息"}), 400

        messages = [
            {"role": "user", "content": "你是一位资深小说家，请根据以下提示创作一篇风格契合、详略得当、细节丰富的小说。"},
            {"role": "user", "content": data["prompt"]}
        ]

        # 调用glm-4.6模型生成小说
        response = client.chat.completions.create(
            model="glm-4.6",
            messages=messages,
            thinking={"type": "enabled"},
            temperature=0.7
        )

        print("大模型原始响应：", response)
        print("AI回复内容：", response.choices[0].message.content)

        return jsonify({"response": response.choices[0].message.content})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
