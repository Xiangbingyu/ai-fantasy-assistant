"""
小说生成工作流测试脚本
测试 CrewAI 工作流是否能正常运行
"""

import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from app.crew.novel_crew import generate_novel_with_crew


def test_without_history():
    """测试无历史章节的小说生成"""
    print("=" * 80)
    print("测试 1: 无历史章节的小说生成")
    print("=" * 80)
    
    # 测试数据
    worldview = "这是一个充满魔法和奇幻的世界，人类与精灵共存，魔法师掌握着强大的元素力量。"
    master_sitting = "主角：艾瑞克，一名年轻的元素魔法师，性格勇敢但有些鲁莽，渴望成为最强大的魔法师。"
    main_characters = "导师：老魔法师梅林，智慧而神秘；好友：精灵弓箭手莉莉，敏捷且忠诚。"
    background = "艾瑞克从小在魔法学院学习，最近刚刚通过了初级魔法师考试，准备开始他的冒险之旅。"
    mc_text = "艾瑞克，一名年轻的元素魔法师，性格勇敢但有些鲁莽，渴望成为最强大的魔法师。"
    dialogue_content = "艾瑞克站在魔法学院的门口，深吸一口气，准备开始他的第一次冒险。他对梅林说：'导师，我准备好了，我要去寻找传说中的元素水晶！'梅林微笑着点头：'很好，艾瑞克，但你要记住，力量不是一切，智慧同样重要。'"
    
    try:
        print("\n开始生成小说...")
        print(f"对话内容: {dialogue_content[:50]}...\n")
        
        result = generate_novel_with_crew(
            worldview=worldview,
            master_sitting=master_sitting,
            main_characters=main_characters,
            background=background,
            mc_text=mc_text,
            dialogue_content=dialogue_content,
            history_chapter_id=None  # 无历史章节
        )
        
        print("\n" + "=" * 80)
        print("生成结果:")
        print("=" * 80)
        print(result)
        print("\n✅ 测试 1 通过：无历史章节的小说生成成功！")
        
    except Exception as e:
        print(f"\n❌ 测试 1 失败：{str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


def test_with_history():
    """测试有历史章节的小说生成"""
    print("\n" + "=" * 80)
    print("测试 2: 有历史章节的小说生成")
    print("=" * 80)
    
    # 测试数据
    worldview = "这是一个充满魔法和奇幻的世界，人类与精灵共存，魔法师掌握着强大的元素力量。"
    master_sitting = "主角：艾瑞克，一名年轻的元素魔法师，性格勇敢但有些鲁莽，渴望成为最强大的魔法师。"
    main_characters = "导师：老魔法师梅林，智慧而神秘；好友：精灵弓箭手莉莉，敏捷且忠诚。"
    background = "艾瑞克从小在魔法学院学习，最近刚刚通过了初级魔法师考试，准备开始他的冒险之旅。"
    mc_text = "艾瑞克，一名年轻的元素魔法师，性格勇敢但有些鲁莽，渴望成为最强大的魔法师。"
    dialogue_content = "艾瑞克站在魔法学院的门口，深吸一口气，准备开始他的第一次冒险。他对梅林说：'导师，我准备好了，我要去寻找传说中的元素水晶！'梅林微笑着点头：'很好，艾瑞克，但你要记住，力量不是一切，智慧同样重要。'"
    
    # 注意：这里使用一个虚构的历史章节ID，实际测试时需要使用数据库中真实存在的ID
    # 如果数据库中没有数据，这个测试会失败，但可以验证代码逻辑
    history_chapter_id = "11"
    
    try:
        print("\n开始生成小说...")
        print(f"对话内容: {dialogue_content[:50]}...")
        print(f"历史章节ID: {history_chapter_id}\n")
        
        result = generate_novel_with_crew(
            worldview=worldview,
            master_sitting=master_sitting,
            main_characters=main_characters,
            background=background,
            mc_text=mc_text,
            dialogue_content=dialogue_content,
            history_chapter_id=history_chapter_id  # 有历史章节
        )
        
        print("\n" + "=" * 80)
        print("生成结果:")
        print("=" * 80)
        print(result)
        print("\n✅ 测试 2 通过：有历史章节的小说生成成功！")
        
    except Exception as e:
        print(f"\n❌ 测试 2 失败：{str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


def main():
    """主测试函数"""
    print("\n" + "=" * 80)
    print("小说生成工作流测试")
    print("=" * 80)
    
    # 检查环境变量
    from app.config import Config
    if not Config.ZHIPU_API_KEY:
        print("\n⚠️  警告：未设置 ZHIPU_API_KEY 环境变量")
        print("请确保在 .env 文件中设置了 ZHIPU_API_KEY")
        return
    
    print(f"\n✅ 环境检查通过")
    print(f"API Key: {Config.ZHIPU_API_KEY[:10]}...{Config.ZHIPU_API_KEY[-4:]}")
    
    # 运行测试
    test_results = []
    
    # 测试 1: 无历史章节
    test_results.append(test_without_history())
    
    # 测试 2: 有历史章节（可能会因为数据库中没有对应记录而失败，但可以验证代码逻辑）
    test_results.append(test_with_history())
    
    # 总结
    print("\n" + "=" * 80)
    print("测试总结")
    print("=" * 80)
    print(f"测试 1（无历史章节）: {'✅ 通过' if test_results[0] else '❌ 失败'}")
    print(f"测试 2（有历史章节）: {'✅ 通过' if test_results[1] else '❌ 失败'}")
    print(f"\n总测试数: {len(test_results)}")
    print(f"通过数: {sum(test_results)}")
    print(f"失败数: {len(test_results) - sum(test_results)}")
    
    if all(test_results):
        print("\n🎉 所有测试通过！")
    else:
        print("\n⚠️  部分测试失败，请检查错误信息")


if __name__ == "__main__":
    main()
