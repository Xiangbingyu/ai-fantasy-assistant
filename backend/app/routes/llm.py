from flask import Blueprint, request, jsonify
from zai import ZhipuAiClient
from app.config import Config
import json

llm_bp = Blueprint('llm', __name__, url_prefix='/api')

client = ZhipuAiClient(api_key=Config.ZHIPU_API_KEY)

@llm_bp.route("/chat", methods=["POST"])
def chat():
    try:
        # 仅接收历史消息，系统提示词由后端统一注入
        data = request.get_json(silent=True) or {}
        history = data.get("messages") or []

        system_prompt = "你是一个奇幻世界创作助手，帮助完善世界观设定。"

        messages = [{"role": "system", "content": system_prompt}] + history

        response = client.chat.completions.create(
            model="glm-3-turbo",
            messages=messages,
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

@llm_bp.route("/chat/suggestions", methods=["POST"])
def chat_suggestions():
    try:
        data = request.get_json(silent=True) or {}
        history = data.get("messages") or []

        suggest_prompt = (
            "你是一个回复辅助助手。基于用户与AI的历史对话，生成6条可能的下一条回复示例。"
            "严格按JSON数组输出，每个元素为对象：{\"content\": \"示例回复\"}。"
            "不要输出额外解释或非JSON文本。风格：简洁自然、中文、避免重复。"
        )

        messages = [{"role": "system", "content": suggest_prompt}] + history

        response = client.chat.completions.create(
            model="glm-3-turbo",
            messages=messages,
            temperature=0.6,
            max_tokens=600
        )

        text = response.choices[0].message.content

        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return jsonify({"suggestions": parsed})
            else:
                return jsonify({"raw": text})
        except Exception:
            return jsonify({"raw": text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@llm_bp.route("/novel", methods=["POST"])
def generate_novel():
    try:
        # 获取前端传递的参数
        data = request.get_json()
        if not data or "prompt" not in data:
            return jsonify({"error": "缺少小说生成提示信息"}), 400

        system_prompt = (
            "你是一位资深小说家，请根据以下提示创作一篇风格契合、详略得当、细节丰富的小说。"
        )

        messages = [
            {"role": "system", "content": system_prompt},
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
