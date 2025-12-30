"""
小说生成工作流模块
使用 CrewAI 框架构建多智能体协作的小说生成系统
"""

from crewai import Agent, Task, Crew, Process
from typing import Dict, Optional
from app.models import NovelRecord


class NovelCrew:
    """小说生成工作流管理类"""
    
    def __init__(self, zhipu_api_key: str):
        """
        初始化工作流
        
        Args:
            zhipu_api_key: 智谱AI的API密钥
        """
        self.zhipu_api_key = zhipu_api_key
        
    def generate_novel(self, data: Dict, has_history: bool = False) -> str:
        """
        生成小说章节（象征性实现，后续会重构）
        
        Args:
            data: 输入数据
            has_history: 是否有历史章节
        
        Returns:
            生成的小说内容
        """
        # TODO: 后续重构时实现完整的工作流
        # 这里暂时返回占位符
        return "小说生成工作流（待重构）"


def generate_novel_with_crew(
    worldview: str,
    master_sitting: str,
    main_characters: str,
    background: str,
    mc_text: str,
    dialogue_content: str,
    history_chapter_id: Optional[str] = None
) -> str:
    """
    使用 CrewAI 工作流生成小说的便捷函数
    
    Args:
        worldview: 世界观
        master_sitting: 核心人物设定
        main_characters: 其余角色
        background: 玩家背景
        mc_text: 主要角色文本
        dialogue_content: 对话内容
        history_chapter_id: 历史章节ID，如果有则视为创作新章节
    
    Returns:
        生成的小说内容
    """
    from app.config import Config
    from app import create_app

    has_history = history_chapter_id is not None and history_chapter_id != ""

    history_chapters = ""
    if has_history:
        app = create_app()
        with app.app_context():
            novel_record = NovelRecord.query.get(history_chapter_id)
            if novel_record:
                history_chapters = novel_record.content

    data = {
        "worldview": worldview,
        "master_sitting": master_sitting,
        "main_characters": main_characters,
        "background": background,
        "mc_text": mc_text,
        "prompt": dialogue_content,
        "history_chapters": history_chapters
    }

    crew = NovelCrew(zhipu_api_key=Config.ZHIPU_API_KEY)

    result = crew.generate_novel(data, has_history)
    
    return result
