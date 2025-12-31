"""
小说生成接口测试脚本
测试 /novel 接口是否能正常运行
"""

import sys
import os
import time

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from app import create_app


def test_novel_api():
    """测试 /novel 接口"""
    print("=" * 80)
    print("测试: /novel 接口")
    print("=" * 80)
    
    # 创建 Flask 应用和测试客户端
    app = create_app()
    client = app.test_client()
    
    # 测试数据
    request_data = {
        "chapter_id": 205,
        "user_id": 4,
        "prompt": "艾瑞克站在魔法学院的门口，深吸一口气，准备开始他的第一次冒险。他对梅林说：'导师，我准备好了，我要去寻找传说中的元素水晶！'梅林微笑着点头：'很好，艾瑞克，但你要记住，力量不是一切，智慧同样重要。'",
        "worldview": "这是一个充满魔法和奇幻的世界，人类与精灵共存，魔法师掌握着强大的元素力量。",
        "master_sitting": "主角：艾瑞克，一名年轻的元素魔法师，性格勇敢但有些鲁莽，渴望成为最强大的魔法师。",
        "main_characters": "导师：老魔法师梅林，智慧而神秘；好友：精灵弓箭手莉莉，敏捷且忠诚。",
        "background": "艾瑞克从小在魔法学院学习，最近刚刚通过了初级魔法师考试，准备开始他的冒险之旅。",
        "history_chapter_id": ""
    }
    
    try:
        print("\n发送请求到 /novel 接口...")
        print(f"chapter_id: {request_data['chapter_id']}")
        print(f"user_id: {request_data['user_id']}")
        print(f"history_chapter_id: {request_data['history_chapter_id']}")
        print(f"prompt: {request_data['prompt'][:50]}...\n")
        
        # 发送 POST 请求
        response = client.post('/api/novel', 
                              json=request_data,
                              content_type='application/json')
        
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.get_json()
            print(f"\n响应内容:")
            print(f"  task_id: {result.get('task_id')}")
            print(f"  status: {result.get('status')}")
            print(f"  message: {result.get('message')}")
            
            task_id = result.get('task_id')
            
            # 轮询查询任务状态
            print("\n开始轮询任务状态...")
            max_attempts = 60  # 最多等待60次，每次1秒
            attempt = 0
            
            while attempt < max_attempts:
                attempt += 1
                time.sleep(1)  # 等待1秒
                
                # 查询任务状态
                status_response = client.get(f'/api/novel/status/{task_id}')
                status_data = status_response.get_json()
                
                status = status_data.get('status')
                progress = status_data.get('progress', '')
                
                print(f"  第 {attempt} 次: status={status}, progress={progress}")
                
                if status == 'completed':
                    print("\n" + "=" * 80)
                    print("生成结果:")
                    print("=" * 80)
                    result_content = status_data.get('result', '')
                    print(result_content)
                    print("\n✅ 测试通过：小说生成成功并已存储到数据库！")
                    return True
                elif status == 'failed':
                    error = status_data.get('error', '未知错误')
                    print(f"\n❌ 测试失败：任务执行失败 - {error}")
                    return False
            
            print(f"\n⚠️  测试超时：任务在 {max_attempts} 秒内未完成")
            return False
            
        else:
            error_data = response.get_json()
            print(f"\n❌ 测试失败：{error_data.get('error', '未知错误')}")
            return False
        
    except Exception as e:
        print(f"\n❌ 测试失败：{str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主测试函数"""
    print("\n" + "=" * 80)
    print("小说生成接口测试")
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
    success = test_novel_api()
    
    # 总结
    print("\n" + "=" * 80)
    print("测试总结")
    print("=" * 80)
    print(f"测试结果: {'✅ 通过' if success else '❌ 失败'}")
    
    if success:
        print("\n🎉 测试通过！小说已成功生成并存储到数据库中。")
    else:
        print("\n⚠️  测试失败，请检查错误信息")


if __name__ == "__main__":
    main()
