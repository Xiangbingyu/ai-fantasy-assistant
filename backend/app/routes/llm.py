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

        system_prompt = "你是一个奇幻世界创作助手，根据对话内容以及世界观，角色设定，章节背景，扮演角色来补充一句对话内容，保持对话的连贯性。"

        # 新增：从请求体获取上下文字段并组装为第二条 system 消息
        worldview = data.get("worldview")
        master_sitting = data.get("master_sitting")
        main_characters = data.get("main_characters")
        background = data.get("background")

        if isinstance(main_characters, (list, tuple)):
            mc_text = ", ".join([str(x) for x in main_characters])
        elif isinstance(main_characters, dict):
            mc_text = json.dumps(main_characters, ensure_ascii=False)
        else:
            mc_text = str(main_characters) if main_characters is not None else ""

        context_prompt = (
            f"世界观：{worldview or ''}\n"
            f"主控设定：{master_sitting or ''}\n"
            f"主要角色：{mc_text}\n"
            f"章节背景：{background or ''}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": context_prompt},
        ] + history

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

        # 新增：从请求体获取上下文字段并组装为第二条 system 消息
        worldview = data.get("worldview")
        master_sitting = data.get("master_sitting")
        main_characters = data.get("main_characters")
        background = data.get("background")

        if isinstance(main_characters, (list, tuple)):
            mc_text = ", ".join([str(x) for x in main_characters])
        elif isinstance(main_characters, dict):
            mc_text = json.dumps(main_characters, ensure_ascii=False)
        else:
            mc_text = str(main_characters) if main_characters is not None else ""

        context_prompt = (
            f"世界观：{worldview or ''}\n"
            f"总设定（master_sitting）：{master_sitting or ''}\n"
            f"主要角色：{mc_text}\n"
            f"章节背景：{background or ''}"
        )

        messages = [
            {"role": "system", "content": suggest_prompt},
            {"role": "system", "content": context_prompt},
        ] + history

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

        # 新增：从请求体获取上下文字段并组装为第二条 system 消息
        worldview = data.get("worldview")
        master_sitting = data.get("master_sitting")
        main_characters = data.get("main_characters")
        background = data.get("background")

        if isinstance(main_characters, (list, tuple)):
            mc_text = ", ".join([str(x) for x in main_characters])
        elif isinstance(main_characters, dict):
            mc_text = json.dumps(main_characters, ensure_ascii=False)
        else:
            mc_text = str(main_characters) if main_characters is not None else ""

        context_prompt = (
            f"世界观：{worldview or ''}\n"
            f"主控设定：{master_sitting or ''}\n"
            f"主要角色：{mc_text}\n"
            f"章节背景：{background or ''}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": context_prompt},
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
