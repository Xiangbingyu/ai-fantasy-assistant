"""
小说生成工作流模块
使用 CrewAI 框架构建多智能体协作的小说生成系统
"""

import os
import sys
import signal

# Monkey patch: 禁用 signal.signal 在非主线程中的调用
_original_signal_signal = signal.signal

def _safe_signal(sig, handler):
    try:
        return _original_signal_signal(sig, handler)
    except ValueError:
        # 忽略在非主线程中注册信号处理器的错误
        return None

signal.signal = _safe_signal

from crewai import Agent, Task, Crew, Process, LLM
from typing import Dict, Optional, List
from app.models import NovelRecord
import yaml


class NovelCrew:
    """小说生成工作流管理类"""
    
    def __init__(self, zhipu_api_key: str):
        """
        初始化工作流
        
        Args:
            zhipu_api_key: 智谱AI的API密钥
        """
        self.zhipu_api_key = zhipu_api_key
        
        self.llm_plus = LLM(
            model="glm-4-plus",
            base_url="https://open.bigmodel.cn/api/paas/v4",
            temperature=0.7,
            api_key=zhipu_api_key
        )
        
        self.llm_46 = LLM(
            model="glm-4.6",
            base_url="https://open.bigmodel.cn/api/paas/v4",
            temperature=0.7,
            api_key=zhipu_api_key
        )
        
        # 加载智能体和任务配置
        self.agents_config = self._load_yaml('agents.yaml')
        self.tasks_config = self._load_yaml('tasks.yaml')
        
    def _load_yaml(self, filename: str) -> Dict:
        """
        加载 YAML 配置文件
        
        Args:
            filename: YAML 文件名
        
        Returns:
            配置字典
        """
        current_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(current_dir, 'prompts', filename)
        
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def create_agents(self) -> Dict[str, Agent]:
        """
        创建所有智能体
        
        Returns:
            智能体字典
        """
        agents = {}
        
        for agent_name, agent_config in self.agents_config.items():
            if agent_name == 'writer':
                # llm = self.llm_46
                llm = self.llm_plus
            else:
                llm = self.llm_plus
            
            agent = Agent(
                role=agent_config['role'],
                goal=agent_config['goal'],
                backstory=agent_config['backstory'],
                verbose=agent_config.get('verbose', True),
                allow_delegation=agent_config.get('allow_delegation', False),
                llm=llm
            )
            agents[agent_name] = agent
        
        return agents
    
    def create_tasks(self, agents: Dict[str, Agent], data: Dict, has_history: bool = False) -> List[Task]:
        """
        创建任务列表
        
        Args:
            agents: 智能体字典
            data: 输入数据，包含对话内容、世界观、人物设定等
            has_history: 是否有历史章节
        
        Returns:
            任务列表
        """
        tasks = []
        
        historical_task = None
        if has_history:
            historical_task = Task(
                description=self.tasks_config['historical_context_analysis']['description'].format(
                    history_chapters=data.get('history_chapters', '')
                ),
                agent=agents['historical_context_analyst'],
                expected_output=self.tasks_config['historical_context_analysis']['expected_output']
            )
            tasks.append(historical_task)
        
        dialogue_task = Task(
            description=self.tasks_config['dialogue_analysis']['description'].format(
                prompt=data.get('prompt', ''),
                worldview=data.get('worldview', ''),
                master_sitting=data.get('master_sitting', ''),
                mc_text=data.get('mc_text', ''),
                background=data.get('background', '')
            ),
            agent=agents['dialogue_analyst'],
            expected_output=self.tasks_config['dialogue_analysis']['expected_output']
        )
        tasks.append(dialogue_task)
        
        context_tasks = [dialogue_task]
        if historical_task:
            context_tasks.insert(0, historical_task)
        
        planning_task = Task(
            description=self.tasks_config['story_planning']['description'].replace('{prompt}', data.get('prompt', '')),
            agent=agents['story_planner'],
            expected_output=self.tasks_config['story_planning']['expected_output'],
            context=context_tasks
        )
        tasks.append(planning_task)
        
        writing_task = Task(
            description=self.tasks_config['writing']['description'].replace('{prompt}', data.get('prompt', '')),
            agent=agents['writer'],
            expected_output=self.tasks_config['writing']['expected_output'],
            context=[planning_task]
        )
        tasks.append(writing_task)
        
        polishing_task = Task(
            description=self.tasks_config['polishing']['description'],
            agent=agents['polisher'],
            expected_output=self.tasks_config['polishing']['expected_output'],
            context=[writing_task]
        )
        tasks.append(polishing_task)
        
        return tasks
    
    def generate_novel(self, data: Dict, has_history: bool = False) -> str:
        """
        生成小说章节
        
        Args:
            data: 输入数据
            has_history: 是否有历史章节
        
        Returns:
            生成的小说内容
        """
        agents = self.create_agents()
        tasks = self.create_tasks(agents, data, has_history)

        crew = Crew(
            agents=list(agents.values()),
            tasks=tasks,
            process=Process.sequential,  # 顺序执行
            verbose=True,
            max_rpm=60  # 限制每分钟请求数，防止API限流
        )

        result = crew.kickoff()
        
        return str(result)

def generate_novel_with_crew(
    worldview: str,
    master_sitting: str,
    main_characters: str,
    background: str,
    mc_text: str,
    dialogue_content: str,
    history_chapter_id: Optional[str] = None,
    chapter_id: Optional[int] = None,
    user_id: Optional[int] = None
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
        chapter_id: 当前章节ID，用于存储生成的小说
        user_id: 用户ID，用于存储生成的小说
    
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










