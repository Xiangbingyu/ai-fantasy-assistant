"""
自动对话接口测试脚本
测试 /auto-chat/ai-character 和 /auto-chat/ai-user 接口是否能正常运行
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from app import create_app


def test_auto_chat_ai_character():
    """测试 /auto-chat/ai-character 接口"""
    print("=" * 80)
    print("测试: /auto-chat/ai-character 接口 (AI角色扮演者)")
    print("=" * 80)
    
    app = create_app()
    client = app.test_client()
    
    request_data = {
        "messages": [
            {
                "role": "user",
                "content": "你好，我想了解一下这个世界的情况。"
            }
        ],
        "worldview": "这是一个充满魔法和奇幻的世界，人类与精灵共存，魔法师掌握着强大的元素力量。",
        "master_sitting": "主角：艾瑞克，一名年轻的元素魔法师，性格勇敢但有些鲁莽，渴望成为最强大的魔法师。",
        "main_characters": "导师：老魔法师梅林，智慧而神秘；好友：精灵弓箭手莉莉，敏捷且忠诚。",
        "background": "艾瑞克从小在魔法学院学习，最近刚刚通过了初级魔法师考试，准备开始他的冒险之旅。",
        "story_analysis": "当前场景：艾瑞克刚刚进入魔法学院，准备开始他的冒险。",
        "story_guide": "引导艾瑞克了解魔法学院的基本情况，并激发他的冒险欲望。"
    }
    
    try:
        print("\n发送请求到 /auto-chat/ai-character 接口...")
        print(f"世界观: {request_data['worldview'][:50]}...")
        print(f"角色设定: {request_data['master_sitting'][:50]}...")
        print(f"历史消息数: {len(request_data['messages'])}\n")
        
        response = client.post('/api/auto-chat/ai-character',
                              json=request_data,
                              content_type='application/json')
        
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.get_json()
            print(f"\n响应内容:")
            print(f"  response: {result.get('response')}")
            
            response_content = result.get('response', '')
            
            if response_content and len(response_content) > 0:
                print(f"\n✅ 测试通过：AI角色扮演者接口正常工作")
                print(f"生成的回复长度: {len(response_content)} 字符")
                return True
            else:
                print(f"\n❌ 测试失败：返回的回复内容为空")
                return False
        else:
            error_data = response.get_json()
            error_msg = error_data.get('error', '未知错误') if error_data else f'HTTP {response.status_code}'
            print(f"\n❌ 测试失败：{error_msg}")
            return False
        
    except Exception as e:
        print(f"\n❌ 测试失败：{str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_auto_chat_ai_user():
    """测试 /auto-chat/ai-user 接口"""
    print("\n" + "=" * 80)
    print("测试: /auto-chat/ai-user 接口 (AI用户扮演者)")
    print("=" * 80)
    
    app = create_app()
    client = app.test_client()
    
    request_data = {
        "messages": [
            {
                "role": "user",
                "content": "你好，我想了解一下这个世界的情况。"
            },
            {
                "role": "assistant",
                "content": "艾瑞克微笑着向你走来，眼中闪烁着兴奋的光芒。欢迎来到魔法学院！这里是一个充满奇迹的地方，你将在这里学习掌控元素的力量。我是梅林，学院的导师，很高兴能指导你的学习之旅。"
            }
        ],
        "worldview": "这是一个充满魔法和奇幻的世界，人类与精灵共存，魔法师掌握着强大的元素力量。",
        "master_sitting": "主角：艾瑞克，一名年轻的元素魔法师，性格勇敢但有些鲁莽，渴望成为最强大的魔法师。",
        "main_characters": "导师：老魔法师梅林，智慧而神秘；好友：精灵弓箭手莉莉，敏捷且忠诚。",
        "background": "艾瑞克从小在魔法学院学习，最近刚刚通过了初级魔法师考试，准备开始他的冒险之旅。",
        "story_analysis": "当前场景：艾瑞克刚刚进入魔法学院，准备开始他的冒险。",
        "story_guide": "引导艾瑞克了解魔法学院的基本情况，并激发他的冒险欲望。"
    }
    
    try:
        print("\n发送请求到 /auto-chat/ai-user 接口...")
        print(f"世界观: {request_data['worldview'][:50]}...")
        print(f"角色设定: {request_data['master_sitting'][:50]}...")
        print(f"历史消息数: {len(request_data['messages'])}\n")
        
        response = client.post('/api/auto-chat/ai-user',
                              json=request_data,
                              content_type='application/json')
        
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.get_json()
            print(f"\n响应内容:")
            print(f"  response: {result.get('response')}")
            
            response_content = result.get('response', '')
            
            if response_content and len(response_content) > 0:
                print(f"\n✅ 测试通过：AI用户扮演者接口正常工作")
                print(f"生成的回复长度: {len(response_content)} 字符")
                return True
            else:
                print(f"\n❌ 测试失败：返回的回复内容为空")
                return False
        else:
            error_data = response.get_json()
            error_msg = error_data.get('error', '未知错误') if error_data else f'HTTP {response.status_code}'
            print(f"\n❌ 测试失败：{error_msg}")
            return False
        
    except Exception as e:
        print(f"\n❌ 测试失败：{str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_auto_chat_cycle():
    """测试完整的自动对话循环"""
    print("\n" + "=" * 80)
    print("测试: 完整的自动对话循环")
    print("=" * 80)
    
    app = create_app()
    client = app.test_client()
    
    base_data = {
        "worldview": "这是一个充满魔法和奇幻的世界，人类与精灵共存，魔法师掌握着强大的元素力量。",
        "master_sitting": "主角：艾瑞克，一名年轻的元素魔法师，性格勇敢但有些鲁莽，渴望成为最强大的魔法师。",
        "main_characters": "导师：老魔法师梅林，智慧而神秘；好友：精灵弓箭手莉莉，敏捷且忠诚。",
        "background": "艾瑞克从小在魔法学院学习，最近刚刚通过了初级魔法师考试，准备开始他的冒险之旅。",
        "story_analysis": "当前场景：艾瑞克刚刚进入魔法学院，准备开始他的冒险。",
        "story_guide": "引导艾瑞克了解魔法学院的基本情况，并激发他的冒险欲望。"
    }
    
    try:
        messages = [
            {
                "role": "user",
                "content": "你好，我想了解一下这个世界的情况。"
            }
        ]
        
        print("\n第一轮：调用 AI 角色扮演者接口...")
        char_request = {
            **base_data,
            "messages": messages
        }
        
        char_response = client.post('/api/auto-chat/ai-character',
                                    json=char_request,
                                    content_type='application/json')
        
        if char_response.status_code != 200:
            print(f"\n❌ AI角色扮演者接口调用失败")
            return False
        
        char_result = char_response.get_json()
        char_content = char_result.get('response', '')
        print(f"AI角色回复: {char_content[:50]}...")
        
        messages.append({
            "role": "assistant",
            "content": char_content
        })
        
        print("\n第二轮：调用 AI 用户扮演者接口...")
        user_request = {
            **base_data,
            "messages": messages
        }
        
        user_response = client.post('/api/auto-chat/ai-user',
                                    json=user_request,
                                    content_type='application/json')
        
        if user_response.status_code != 200:
            print(f"\n❌ AI用户扮演者接口调用失败")
            return False
        
        user_result = user_response.get_json()
        user_content = user_result.get('response', '')
        print(f"AI用户回复: {user_content[:50]}...")
        
        print(f"\n✅ 测试通过：完整的自动对话循环正常工作")
        return True
        
    except Exception as e:
        print(f"\n❌ 测试失败：{str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主测试函数"""
    print("\n" + "=" * 80)
    print("自动对话接口测试")
    print("=" * 80)
    
    from app.config import Config
    if not Config.ZHIPU_API_KEY:
        print("\n⚠️  警告：未设置 ZHIPU_API_KEY 环境变量")
        print("请确保在 .env 文件中设置了 ZHIPU_API_KEY")
        return
    
    print(f"\n✅ 环境检查通过")
    print(f"API Key: {Config.ZHIPU_API_KEY[:10]}...{Config.ZHIPU_API_KEY[-4:]}")
    
    results = []
    
    results.append(("AI角色扮演者接口", test_auto_chat_ai_character()))
    results.append(("AI用户扮演者接口", test_auto_chat_ai_user()))
    results.append(("完整对话循环", test_auto_chat_cycle()))
    
    print("\n" + "=" * 80)
    print("测试总结")
    print("=" * 80)
    
    for test_name, success in results:
        status = "✅ 通过" if success else "❌ 失败"
        print(f"{test_name}: {status}")
    
    all_passed = all(success for _, success in results)
    
    print("\n" + "=" * 80)
    if all_passed:
        print("🎉 所有测试通过！自动对话接口工作正常。")
    else:
        print("⚠️  部分测试失败，请检查错误信息。")
    print("=" * 80)


if __name__ == "__main__":
    main()
