from flask import Blueprint, request, jsonify, current_app, copy_current_request_context
from zai import ZhipuAiClient
from app.config import Config
import json
import uuid
import threading
import time
from datetime import datetime

llm_bp = Blueprint('llm', __name__, url_prefix='/api')

client = ZhipuAiClient(api_key=Config.ZHIPU_API_KEY)

# 全局任务存储，用于跟踪异步任务状态
novel_tasks = {}

def generate_novel_async(task_id, data):
    """异步生成小说的后台任务"""
    try:
        from app.models import db, NovelRecord
        from datetime import datetime
        
        # 获取必要参数
        history_chapter_id = data.get("history_chapter_id")
        worldview = data.get("worldview")
        master_sitting = data.get("master_sitting")
        main_characters = data.get("main_characters")
        background = data.get("background")
        dialogue_content = data.get("prompt")
        chapter_id = data.get("chapter_id")
        user_id = data.get("user_id")
        title = data.get("title")

        # 更新任务状态为处理中
        novel_tasks[task_id] = {
            "status": "processing",
            "progress": "开始生成小说...",
            "created_at": datetime.now().isoformat(),
            "result": None,
            "error": None
        }

        # 判断是否为创作新章节
        has_history = history_chapter_id is not None and history_chapter_id != ""
        
        if has_history:
            novel_tasks[task_id]["progress"] = "检测到历史章节，正在分析上下文..."
        else:
            novel_tasks[task_id]["progress"] = "开始创作独立章节..."

        # 统一组装主要角色信息
        if isinstance(main_characters, (list, tuple)):
            mc_text = ", ".join([str(x) for x in main_characters])
        elif isinstance(main_characters, dict):
            mc_text = json.dumps(main_characters, ensure_ascii=False)
        else:
            mc_text = str(main_characters) if main_characters is not None else ""

        # 更新进度：开始调用工作流
        novel_tasks[task_id]["progress"] = "正在启动 CrewAI 工作流..."

        # 调用 CrewAI 工作流生成小说
        from app.crew.novel_crew import generate_novel_with_crew
        
        result = generate_novel_with_crew(
            worldview=worldview,
            master_sitting=master_sitting,
            main_characters=main_characters,
            background=background,
            mc_text=mc_text,
            dialogue_content=dialogue_content,
            history_chapter_id=history_chapter_id
        )
        
        print(f"任务 {task_id} CrewAI 工作流生成结果：", result)
        
        # 更新任务状态为完成
        novel_tasks[task_id].update({
            "status": "completed",
            "progress": "小说生成完成",
            "result": result,
            "completed_at": datetime.now().isoformat()
        })

        # 自动存储到数据库
        if chapter_id and user_id:
            try:
                novel = NovelRecord(
                    chapter_id=chapter_id,
                    user_id=user_id,
                    title=title,
                    content=result,
                    create_time=datetime.utcnow()
                )
                db.session.add(novel)
                db.session.commit()
                novel_tasks[task_id]["novel_id"] = novel.id
                novel_tasks[task_id]["message"] = "小说已成功保存到数据库"
                print(f"任务 {task_id} 小说已保存到数据库，ID: {novel.id}")
            except Exception as db_error:
                db.session.rollback()
                novel_tasks[task_id]["db_error"] = str(db_error)
                print(f"任务 {task_id} 数据库保存失败：", str(db_error))
        
    except Exception as e:
        print(f"任务 {task_id} 生成失败：", str(e))
        # 更新任务状态为失败
        novel_tasks[task_id].update({
            "status": "failed",
            "error": str(e),
            "failed_at": datetime.now().isoformat()
        })

@llm_bp.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json(silent=True) or {}
        history = data.get("messages") or []

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
你是一位「沉浸式互动剧本作者」，以第三人称全知视角创作，擅长用细腻笔触构建场景、刻画人心。
「核心人物」需作为剧情核心，笔墨占比最高，其行为、神态、语言需严格贴合设定的性格、身份与风格，且避免重复上几轮出现出现的动作与环境细节，通过新增关键信息推动剧情，拒绝刻板化重复。
其余角色与环境仅作为烘托，服务于核心人物塑造与剧情推进，不得抢占核心戏份。
语言风格需深度契合提供的「世界观」，融入场景动态感与人物情绪张力，所有内容必须自然承接玩家上轮话语的核心意涵，可适度延伸对话情境，让互动更具画面流动感。
**严禁描写玩家的任何动作、神态、对话，仅通过核心人物的反应承接玩家行为，不添加玩家视角的回应内容**

[Core Context]
# 世界观
{worldview or '无特殊设定'}（创作时需将世界观元素融入细节，如器物样式、言谈礼节、环境氛围）

# 核心人物（重点刻画）
{master_sitting}

# 其余关系人物（可偶尔出场）
{mc_text or '无特定人物关系'}（出场需有合理性，在推动剧情或衬托核心人物时出现）

# 玩家背景设定
{background or '无特定玩家背景'}（回应时可适度结合玩家设定，让互动更具针对性，仅通过核心人物的反应体现）

# 剧情状态分析
{story_analysis or '无剧情分析信息'}

# 剧情引导（必须遵循）
{story_guide or '无特定剧情引导，可自由发挥'}（引导需 “润物无声”，通过核心人物的对话提议、动作暗示推动剧情，可通过多轮对话衔接实现剧情引导，避免生硬指令与突兀变化）

请务必在回复中自然融入剧情引导要求，让故事发展贴合用户期望的同时，保持叙事的流畅性与沉浸感。

[Input Handling]
玩家消息中的 “开场白”“正文：” 等前缀为系统标记，直接理解内容核心含义即可，回复中无需提及或呼应该前缀，聚焦对话本身的情境延续。

[Output Requirements]
1. 一段 30～100 字的**单段连贯文本**（禁止分段、换行）：
   - 核心人物需包含「动作描写+神态刻画+对话」三要素，逻辑连贯；
   - 允许搭配「人物动作/台词」+「环境/旁白」，但核心人物占主导戏份；
   - 避免 “公式化排列” 要素，让动作、神态、对话自然交织。
2. 禁止出现现代网络梗、OOC 提示、括号解说，语言贴合世界观与角色身份；
3. 直接输出正文内容，**绝对不要**添加任何前缀（如"正文"、"回复"等），聚焦当前对话节点的自然延续，让文字自带 “镜头感”。

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

        return jsonify({"response": response.choices[0].message.content})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@llm_bp.route("/chat/suggestions", methods=["POST"])
def chat_suggestions():
    try:
        data = request.get_json(silent=True) or {}
        history = data.get("messages") or []

        # 统一组装主要角色信息
        main_characters = data.get("main_characters")
        if isinstance(main_characters, (list, tuple)):
            mc_text = ", ".join(map(str, main_characters))
        elif isinstance(main_characters, dict):
            mc_text = json.dumps(main_characters, ensure_ascii=False)
        else:
            mc_text = str(main_characters) if main_characters else ""

        # 定义function call的工具
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "generate_reply_suggestions",
                    "description": "生成6条玩家视角的回复示例，每条对应不同的情节延续方向",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "suggestion_1": {
                                "type": "string",
                                "description": "第一条回复示例，20-80字，中文，贴合世界观与角色身份"
                            },
                            "suggestion_2": {
                                "type": "string",
                                "description": "第二条回复示例，20-80字，中文，贴合世界观与角色身份"
                            },
                            "suggestion_3": {
                                "type": "string",
                                "description": "第三条回复示例，20-80字，中文，贴合世界观与角色身份"
                            },
                            "suggestion_4": {
                                "type": "string",
                                "description": "第四条回复示例，20-80字，中文，贴合世界观与角色身份"
                            },
                            "suggestion_5": {
                                "type": "string",
                                "description": "第五条回复示例，20-80字，中文，贴合世界观与角色身份"
                            },
                            "suggestion_6": {
                                "type": "string",
                                "description": "第六条回复示例，20-80字，中文，贴合世界观与角色身份"
                            }
                        },
                        "required": ["suggestion_1", "suggestion_2", "suggestion_3", "suggestion_4", "suggestion_5", "suggestion_6"]
                    }
                }
            }
        ]

        # 构造 system 提示
        system_prompt = f"""[Role]
你是对话回复辅助生成器，需基于上下文设定与历史对话，生成 6 条玩家视角的回复示例。所有内容必须贴合世界观、核心人物特征，且紧密承接上轮对话，强化剧情连贯性与代入感。

[Output Requirements]
1. 请使用提供的generate_reply_suggestions工具来生成6条回复示例。
2. 每条回复必须对应不同的情节延续方向（如 "主动追问""动作回应""情绪流露" 等，避免方向重复）。
3. 以玩家扮演的身份或者"你"为主语，镜头聚焦玩家动作与情绪。
4. 必须承接上轮对话，自然推进情节；避免重复历史台词。
5. 每句可由动作描写+神态刻画+对话组成，可含简短内心闪念。
6. 简洁自然，20-80字，中文，贴合世界观与角色身份。
7. 严格按照工具定义的参数格式输出，不要有任何额外的解释或说明。

[Core Context]
世界观：{data.get("worldview") or "无特殊设定"}
核心人物设定：{data.get("master_sitting") or "无特定人物关系"}
其余关系人物信息：{mc_text}
玩家背景：{data.get("background") or "无特定场景"}

[Current Conversation History]
{json.dumps(history, ensure_ascii=False) if history else "无历史对话"}
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "现在我需要你生成6条回复示例"}
        ]

        # 创建function call响应
        response = client.chat.completions.create(
            model="glm-4-plus",
            messages=messages,
            tools=tools,
            tool_choice="auto",
            temperature=0.7,
            max_tokens=1000
        )

        # 获取function call结果
        function_call_result = response.choices[0].message.tool_calls[0] if response.choices[0].message.tool_calls else None
        print(function_call_result)
        if function_call_result:
            # 直接返回原始的function call调用信息
            return jsonify({
                'id': function_call_result.id,
                'type': function_call_result.type,
                'function': {
                    'name': function_call_result.function.name,
                    'arguments': function_call_result.function.arguments
                }
            })
        else:
            # 如果没有返回function call，降级处理
            fallback_messages = [
                {"role": "system", "content": "你是对话回复辅助生成器，请直接生成6条回复示例。"},
                {"role": "user", "content": "现在我需要你生成6条回复示例"}
            ]
            
            fallback_response = client.chat.completions.create(
                model="glm-4-plus",
                messages=fallback_messages,
                temperature=0.7,
                max_tokens=600
            )
            
            content = fallback_response.choices[0].message.content
            return jsonify({"fallback_content": content})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def apply_sliding_window(messages, window_size=20):
    """
    应用滑动窗口技术处理对话历史，只保留最近的N轮对话
    
    Args:
        messages: 完整的对话历史列表
        window_size: 滑动窗口大小，默认保留最近20轮对话
    
    Returns:
        处理后的对话历史列表
    """
    if not messages:
        return []
    
    # 确保window_size为正数
    window_size = max(1, window_size)
    
    # 如果消息少于窗口大小，则全部保留
    if len(messages) <= window_size:
        return messages
    
    # 只保留最近的N轮对话
    return messages[-window_size:]

@llm_bp.route("/chat/analyze", methods=["POST"])
def analyze_story():
    try:
        data = request.get_json(silent=True) or {}
        history = data.get("messages") or []
        
        # 应用滑动窗口，保留最近的对话
        # 从请求中获取窗口大小参数，默认为20轮对话
        window_size = 20
        filtered_history = apply_sliding_window(history, window_size)

        # 提取上下文字段
        worldview = data.get("worldview") or ""
        master_sitting = data.get("master_sitting") or ""
        background = data.get("background") or ""

        # 统一处理 main_characters
        main_characters = data.get("main_characters")
        if isinstance(main_characters, (list, tuple)):
            mc_text = ", ".join(map(str, main_characters))
        elif isinstance(main_characters, dict):
            mc_text = json.dumps(main_characters, ensure_ascii=False)
        else:
            mc_text = str(main_characters) if main_characters else "无明确角色"

        print("开始分析剧情:")
        print("世界观:", worldview)
        print("主要角色 setting:", master_sitting)
        print("玩家背景设定:", background)
        print("主要角色信息:", mc_text)
        print(f"原始对话历史长度: {len(history)}, 应用滑动窗口后长度: {len(filtered_history)}")

        # 构造结构化提示词，用于剧情分析
        structured_prompt = f"""[Role]
你是专业剧情分析师，从对话历史提取关键信息，结合世界观、角色与玩家设定，生成简短文本报告，助力后续创作。

[Core Context]
# 世界观
{worldview or '无特殊设定'}

# 核心人物
{master_sitting}

# 其余关系人物
{mc_text or '无特定人物关系'}

# 玩家背景设定
{background or '无特定玩家背景'}

[Current Conversation History]
{json.dumps(filtered_history, ensure_ascii=False) if filtered_history else '无历史对话'}

[Output Requirements]
用流畅中文段落输出，每部分空行隔开，总字数控制在 300 字内：
1. 剧情概览：用80字总结当前剧情走向。
2. 关键事件：按时间顺序列出1-3个最重要的事件，每条20字以内，用"·"开头。
3. 角色与玩家状态：40 字内说明核心角色与玩家的情感 / 立场。
4. 关键伏笔：提 1-2 个影响后续剧情的重要信息。
5. 当前悬念：30 字内点明主要矛盾或待解问题。

无需任何标题或前缀，直接输出正文即可。
"""

        messages = [
            {"role": "system", "content": structured_prompt},
            {"role": "user", "content": "请根据提供的对话历史和上下文信息，分析当前剧情情况，提取关键事件并整理长期记忆。"}
        ]

        response = client.chat.completions.create(
            model="glm-4-plus",
            messages=messages,
            thinking={"type": "enabled"},
            temperature=0.3,
            max_tokens=700
        )

        print("剧情分析原始响应：", response)
        analysis_text = response.choices[0].message.content
        print("剧情分析内容：", analysis_text)

        # 直接返回纯文本分析结果
        return jsonify({"analysis": analysis_text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@llm_bp.route("/novel", methods=["POST"])
def generate_novel():
    try:
        # 获取前端传递的参数
        data = request.get_json()
        if not data or "prompt" not in data:
            return jsonify({"error": "缺少小说生成提示信息"}), 400

        # 验证必填字段
        if "chapter_id" not in data or "user_id" not in data:
            return jsonify({"error": "缺少chapter_id或user_id参数"}), 400

        # 同步调用小说生成
        task_id = str(uuid.uuid4())
        
        # 初始化任务状态
        novel_tasks[task_id] = {
            "status": "processing",
            "progress": "开始生成小说...",
            "created_at": datetime.now().isoformat(),
            "result": None,
            "error": None
        }
        
        # 同步执行小说生成
        generate_novel_async(task_id, data)
        
        # 获取生成结果
        task_info = novel_tasks.get(task_id, {})
        
        if task_info.get("status") == "completed":
            return jsonify({
                "status": "completed",
                "message": task_info.get("message", "小说生成完成"),
                "novel_id": task_info.get("novel_id"),
                "result": task_info.get("result")
            })
        else:
            return jsonify({
                "status": "failed",
                "error": task_info.get("error", "小说生成失败")
            }), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@llm_bp.route("/novel/status/<task_id>", methods=["GET"])
def get_novel_status(task_id):
    """查询小说生成任务状态"""
    try:
        if task_id not in novel_tasks:
            return jsonify({"error": "任务不存在"}), 404
            
        task_info = novel_tasks[task_id]
        return jsonify(task_info)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@llm_bp.route("/novel/cleanup", methods=["POST"])
def cleanup_old_tasks():
    """清理超过24小时的已完成任务"""
    try:
        current_time = datetime.now()
        tasks_to_remove = []
        
        for task_id, task_info in novel_tasks.items():
            if task_info["status"] in ["completed", "failed"]:
                # 获取完成时间
                completed_at = task_info.get("completed_at") or task_info.get("failed_at")
                if completed_at:
                    completed_time = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
                    # 如果任务完成超过24小时，则删除
                    if (current_time - completed_time).total_seconds() > 86400:  # 24小时
                        tasks_to_remove.append(task_id)
        
        # 删除过期任务
        for task_id in tasks_to_remove:
            del novel_tasks[task_id]
        
        return jsonify({
            "message": f"已清理 {len(tasks_to_remove)} 个过期任务",
            "cleaned_tasks": tasks_to_remove
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500