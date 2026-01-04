from flask import Blueprint, request, jsonify
from zai import ZhipuAiClient
from app.config import Config
from app.models import db, ConversationMessage
import json

auto_chat_bp = Blueprint('auto_chat', __name__, url_prefix='/api')

client = ZhipuAiClient(api_key=Config.ZHIPU_API_KEY)

@auto_chat_bp.route("/auto-chat/ai-character", methods=["POST"])
def auto_chat_ai():
    """AI角色扮演者接口 - AI自动生成NPC视角的对话内容"""
    try:
        data = request.get_json(silent=True) or {}
        history = data.get("messages") or []
        chapter_id = data.get("chapterId")
        user_id = data.get("userId")

        print(data)

        # 提取上下文字段
        worldview = data.get("worldview") or ""
        master_sitting = data.get("master_sitting") or ""
        background = data.get("background") or ""
        # 获取剧情分析参数
        story_analysis = data.get("story_analysis") or ""
        # 获取剧情引导参数
        story_guide = data.get("story_guide") or ""

        # 统一处理 main_characters
        main_characters = data.get("main_characters")
        if isinstance(main_characters, (list, tuple)):
            mc_text = ", ".join(map(str, main_characters))
        elif isinstance(main_characters, dict):
            mc_text = json.dumps(main_characters, ensure_ascii=False)
        else:
            mc_text = str(main_characters) if main_characters else "无明确角色"

        print("世界观:", worldview)
        print("主要角色 sitting:", master_sitting)
        print("玩家背景设定:", background)
        print("主要角色信息:", mc_text)
        print("剧情分析:", story_analysis)
        print("剧情引导:", story_guide)

        # 构造结构化提示词
        structured_prompt = f"""[Role]
你现在直接扮演「核心人物」，你就是这个角色本人，请完全沉浸在角色的身份中，以角色的视角思考和行动。
你需要用细腻的笔触构建场景、刻画你的内心世界。
你的行为、神态、语言需严格贴合设定的性格、身份与风格，且避免重复上几轮出现的动作与环境细节，通过新增关键信息推动剧情，拒绝刻板化重复。
其余角色与环境仅作为烘托，服务于你的塑造与剧情推进，不得抢占你的戏份。
语言风格需深度契合提供的「世界观」，融入场景动态感与人物情绪张力，所有内容必须自然承接玩家上轮话语的核心意涵，可适度延伸对话情境，让互动更具画面流动感。
**严禁描写玩家的任何动作、神态、对话，仅通过你的反应承接玩家行为，不添加玩家视角的回应内容**

[Core Context]
# 世界观
{worldview or '无特殊设定'}（创作时需将世界观元素融入细节，如器物样式、言谈礼节、环境氛围）

# 你的角色设定（重点刻画）
{master_sitting}

# 其余关系人物（可偶尔出场）
{mc_text or '无特定人物关系'}（出场需有合理性，在推动剧情或衬托你时出现）

# 玩家背景设定
{background or '无特定玩家背景'}（回应时可适度结合玩家设定，让互动更具针对性，仅通过你的反应体现）

# 剧情状态分析
{story_analysis or '无剧情分析信息'}

# 剧情引导（必须遵循）
{story_guide or '无特定剧情引导，可自由发挥'}（引导需 "润物无声"，通过你的对话提议、动作暗示推动剧情，可通过多轮对话衔接实现剧情引导，避免生硬指令与突兀变化）

请务必在回复中自然融入剧情引导要求，让故事发展贴合用户期望的同时，保持叙事的流畅性与沉浸感。

[Input Handling]
玩家消息中的 "开场白""正文：" 等前缀为系统标记，直接理解内容核心含义即可，回复中无需提及或呼应该前缀，聚焦对话本身的情境延续。

[Output Requirements]
1. 一段 30～100 字的**单段连贯文本**（禁止分段、换行）：
   - 你需包含「动作描写+神态刻画+对话」三要素，逻辑连贯；
   - 允许搭配「你的动作/台词」+「环境/旁白」，但你占主导戏份；
   - 避免 "公式化排列" 要素，让动作、神态、对话自然交织。
2. 禁止出现现代网络梗、OOC 提示、括号解说，语言贴合世界观与角色身份；
3. 直接输出正文内容，**绝对不要**添加任何前缀（如"正文"、"回复"等），聚焦当前对话节点的自然延续，让文字自带 "镜头感"。

[Recent History]
{json.dumps(history, ensure_ascii=False) if history else '无历史对话'}
"""

        messages = [{"role": "system", "content": structured_prompt}] + [{"role":"user","content":"现在我需要你根据最近的历史对话，继续下一个对话节点。"}]

        response = client.chat.completions.create(
            model="glm-4-plus",
            messages=messages,
            temperature=0.7,
            max_tokens=200
        )

        print("大模型原始响应：", response)
        print("AI回复内容：", response.choices[0].message.content)

        ai_response = response.choices[0].message.content

        if chapter_id and user_id:
            new_message = ConversationMessage(
                chapter_id=chapter_id,
                user_id=user_id,
                role='ai',
                content=ai_response
            )
            db.session.add(new_message)
            db.session.commit()
            print(f"消息已保存到数据库，消息ID: {new_message.id}")

        return jsonify({"response": ai_response})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@auto_chat_bp.route("/auto-chat/ai-user", methods=["POST"])
def auto_chat_user():
    """AI用户扮演者接口 - AI自动生成用户视角的对话内容"""
    try:
        data = request.get_json(silent=True) or {}
        history = data.get("messages") or []
        chapter_id = data.get("chapterId")
        user_id = data.get("userId")

        print(data)

        # 提取上下文字段
        worldview = data.get("worldview") or ""
        master_sitting = data.get("master_sitting") or ""
        background = data.get("background") or ""
        # 获取剧情分析参数
        story_analysis = data.get("story_analysis") or ""
        # 获取剧情引导参数
        story_guide = data.get("story_guide") or ""

        # 统一处理 main_characters
        main_characters = data.get("main_characters")
        if isinstance(main_characters, (list, tuple)):
            mc_text = ", ".join(map(str, main_characters))
        elif isinstance(main_characters, dict):
            mc_text = json.dumps(main_characters, ensure_ascii=False)
        else:
            mc_text = str(main_characters) if main_characters else "无明确角色"

        print("世界观:", worldview)
        print("主要角色 sitting:", master_sitting)
        print("玩家背景设定:", background)
        print("主要角色信息:", mc_text)
        print("剧情分析:", story_analysis)
        print("剧情引导:", story_guide)

        # 构造结构化提示词 - 用户视角
        structured_prompt = f"""[Role]
你现在直接扮演「玩家角色」，你就是这个玩家本人，请完全沉浸在玩家的身份中，以玩家的第一人称视角思考和行动。
你需要用细腻的笔触构建场景、刻画你的内心世界。
你的行为、神态、语言需严格贴合设定的性格、身份与风格，且避免重复上几轮出现的动作与环境细节，通过新增关键信息推动剧情，拒绝刻板化重复。
核心人物（NPC）与环境仅作为烘托，服务于你的塑造与剧情推进，不得抢占你的戏份。
语言风格需深度契合提供的「世界观」，融入场景动态感与人物情绪张力，所有内容必须自然承接上轮对话的核心意涵，可适度延伸对话情境，让互动更具画面流动感。
**以你的第一人称视角描写，包括你的动作、神态、对话和心理活动**

[Core Context]
# 世界观
{worldview or '无特殊设定'}（创作时需将世界观元素融入细节，如器物样式、言谈礼节、环境氛围）

# 核心人物（NPC）
{master_sitting}

# 其余关系人物（可偶尔出场）
{mc_text or '无特定人物关系'}（出场需有合理性，在推动剧情或衬托你时出现）

# 你的背景设定
{background or '无特定玩家背景'}（你的背景设定，需在回复中体现）

# 剧情状态分析
{story_analysis or '无剧情分析信息'}

# 剧情引导（必须遵循）
{story_guide or '无特定剧情引导，可自由发挥'}（引导需 "润物无声"，通过你的对话提议、动作暗示推动剧情，可通过多轮对话衔接实现剧情引导，避免生硬指令与突兀变化）

请务必在回复中自然融入剧情引导要求，让故事发展贴合用户期望的同时，保持叙事的流畅性与沉浸感。

[Input Handling]
历史对话中的 "开场白""正文：" 等前缀为系统标记，直接理解内容核心含义即可，回复中无需提及或呼应该前缀，聚焦对话本身的情境延续。

[Output Requirements]
1. 一段 30～100 字的**单段连贯文本**（禁止分段、换行）：
   - 你需包含「动作描写+神态刻画+对话」三要素，逻辑连贯；
   - 允许搭配「你的动作/台词」+「环境/旁白」，但你占主导戏份；
   - 避免 "公式化排列" 要素，让动作、神态、对话自然交织。
2. 禁止出现现代网络梗、OOC 提示、括号解说，语言贴合世界观与角色身份；
3. 直接输出正文内容，**绝对不要**添加任何前缀（如"正文"、"回复"等），聚焦当前对话节点的自然延续，让文字自带 "镜头感"。

[Recent History]
{json.dumps(history, ensure_ascii=False) if history else '无历史对话'}
"""

        messages = [{"role": "system", "content": structured_prompt}] + [{"role":"user","content":"现在我需要你根据最近的历史对话，继续下一个对话节点。"}]

        response = client.chat.completions.create(
            model="glm-4-plus",
            messages=messages,
            temperature=0.7,
            max_tokens=200
        )

        print("大模型原始响应：", response)
        print("用户回复内容：", response.choices[0].message.content)

        user_response = response.choices[0].message.content

        if chapter_id and user_id:
            new_message = ConversationMessage(
                chapter_id=chapter_id,
                user_id=user_id,
                role='user',
                content=user_response
            )
            db.session.add(new_message)
            db.session.commit()
            print(f"消息已保存到数据库，消息ID: {new_message.id}")

        return jsonify({"response": user_response})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
