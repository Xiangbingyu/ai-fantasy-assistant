"""
小说生成工作流模块
使用 CrewAI 框架构建多智能体协作的小说生成系统
"""

from crewai import Agent, Task, Crew, Process, LLM
from typing import Dict, Optional, List
from app.models import NovelRecord
import yaml
import os


class NovelCrew:
    """小说生成工作流管理类"""
    
    def __init__(self, zhipu_api_key: str):
        """
        初始化工作流
        
        Args:
            zhipu_api_key: 智谱AI的API密钥
        """
        self.zhipu_api_key = zhipu_api_key
        
        self.llm = LLM(
            model="glm-4-plus",
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
            agent = Agent(
                role=agent_config['role'],
                goal=agent_config['goal'],
                backstory=agent_config['backstory'],
                verbose=agent_config.get('verbose', True),
                allow_delegation=agent_config.get('allow_delegation', False),
                llm=self.llm
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
        
        # 如果有历史章节，添加历史上下文分析任务
        historical_task = None
        if has_history:
            historical_config = self.tasks_config['historical_context_analysis']
            description = historical_config['description'].format(
                history_chapters=data.get('history_chapters', '')
            )
            historical_task = Task(
                description=description,
                agent=agents['historical_context_analyst'],
                expected_output=historical_config['expected_output']
            )
            tasks.append(historical_task)
        
        # 对话分析任务
        dialogue_config = self.tasks_config['dialogue_analysis']
        description = dialogue_config['description'].format(
            prompt=data.get('prompt', ''),
            worldview=data.get('worldview', ''),
            master_sitting=data.get('master_sitting', ''),
            main_characters=data.get('main_characters', ''),
            background=data.get('background', '')
        )
        dialogue_task = Task(
            description=description,
            agent=agents['dialogue_analyst'],
            expected_output=dialogue_config['expected_output']
        )
        tasks.append(dialogue_task)
        
        # 剧情规划任务
        planning_config = self.tasks_config['story_planning']
        # CrewAI 会自动将前置任务的输出作为上下文，不需要手动添加 {context}
        description = planning_config['description'].replace('{prompt}', data.get('prompt', ''))
        
        context_tasks = [dialogue_task]
        if historical_task:
            context_tasks.insert(0, historical_task)
        
        planning_task = Task(
            description=description,
            agent=agents['story_planner'],
            expected_output=planning_config['expected_output'],
            context=context_tasks  # 依赖历史上下文分析和对话分析的结果
        )
        tasks.append(planning_task)
        
        # 写作任务
        writing_config = self.tasks_config['writing']
        # CrewAI 会自动将前置任务的输出作为上下文，不需要手动添加 {context}
        description = writing_config['description'].replace('{prompt}', data.get('prompt', ''))
        
        writing_task = Task(
            description=description,
            agent=agents['writer'],
            expected_output=writing_config['expected_output'],
            context=[planning_task]  # 依赖剧情规划的结果
        )
        tasks.append(writing_task)
        
        # 修饰润色任务
        polishing_config = self.tasks_config['polishing']
        # CrewAI 会自动将前置任务的输出作为上下文，不需要手动添加 {context}
        description = polishing_config['description']
        
        polishing_task = Task(
            description=description,
            agent=agents['polisher'],
            expected_output=polishing_config['expected_output'],
            context=[writing_task]  # 依赖写作的结果
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
        # 创建智能体
        agents = self.create_agents()
        
        # 创建任务
        tasks = self.create_tasks(agents, data, has_history)
        
        # 创建工作流
        crew = Crew(
            agents=list(agents.values()),
            tasks=tasks,
            process=Process.sequential,  # 顺序执行
            verbose=True,
            max_rpm=60  # 限制每分钟请求数，防止API限流
        )
        
        # 执行工作流
        result = crew.kickoff()
        
        return str(result)

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










