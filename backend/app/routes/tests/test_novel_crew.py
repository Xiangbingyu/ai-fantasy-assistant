import requests
import time
import json

BASE_URL = "http://localhost:4000"

def test_novel_generation():
    """测试小说生成接口"""
    print("=" * 60)
    print("测试 1: 小说生成接口（同步模式）")
    print("=" * 60)
    
    # 准备测试数据
    test_data = {
        "chapter_id": 205,
        "user_id": 4,
        "title": "测试小说",
        "prompt": "生成一个关于古代武侠的故事",
        "worldview": "古代武侠世界，江湖恩怨，侠义精神",
        "master_sitting": "主角是一位年轻的剑客，性格刚正不阿，武功高强",
        "main_characters": [
            {"name": "李云飞", "background": "年轻剑客，正义感强"},
            {"name": "王若雪", "background": "神秘女子，身世成谜"}
        ],
        "background": "故事发生在一个动荡的年代，江湖纷争不断",
        "history_chapter_id": "11"
    }
    
    print(f"发送请求到: {BASE_URL}/api/novel")
    print(f"请求数据: {json.dumps(test_data, ensure_ascii=False, indent=2)}")
    
    try:
        # 调用小说生成接口（同步模式）
        response = requests.post(
            f"{BASE_URL}/api/novel",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\n响应状态码: {response.status_code}")
        result = response.json()
        print(f"响应内容: {json.dumps(result, ensure_ascii=False, indent=2)}")
        
        if response.status_code == 200:
            status = result.get("status")
            if status == "completed":
                print(f"\n✓ 小说生成成功！")
                print(f"小说ID: {result.get('novel_id')}")
                print(f"消息: {result.get('message')}")
                print(f"\n生成的小说内容（前200字）:")
                novel_content = result.get('result', '')
                print(novel_content[:200] + "..." if len(novel_content) > 200 else novel_content)
                return result
            elif status == "failed":
                print(f"\n✗ 小说生成失败")
                print(f"错误信息: {result.get('error')}")
                return result
        else:
            print(f"\n✗ 请求失败")
            return None
            
    except requests.exceptions.ConnectionError:
        print(f"\n✗ 无法连接到服务器 {BASE_URL}")
        print("请确保后端服务正在运行（端口 4000）")
        return None
    except Exception as e:
        print(f"\n✗ 请求失败: {str(e)}")
        return None

def test_novel_status(task_id):
    """测试任务状态查询接口（已弃用，保留用于兼容性测试）"""
    print("\n" + "=" * 60)
    print("测试 2: 任务状态查询接口（已弃用）")
    print("=" * 60)
    
    print("注意：由于接口已改为同步模式，此接口主要用于测试向后兼容性")
    
    if not task_id:
        print("✗ 没有有效的任务ID，跳过测试")
        return None
    
    try:
        print(f"\n查询任务状态: {task_id}")
        response = requests.get(f"{BASE_URL}/api/novel/status/{task_id}")
        
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            task_info = response.json()
            print(f"任务状态: {task_info.get('status')}")
            print(f"进度: {task_info.get('progress')}")
            print(f"\n✓ 状态查询接口仍然可用（向后兼容）")
            return task_info
        else:
            print(f"✗ 查询失败，状态码: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"✗ 查询失败: {str(e)}")
        return None

def test_novel_cleanup():
    """测试任务清理接口"""
    print("\n" + "=" * 60)
    print("测试 3: 任务清理接口")
    print("=" * 60)
    
    try:
        response = requests.post(f"{BASE_URL}/api/novel/cleanup")
        
        print(f"响应状态码: {response.status_code}")
        result = response.json()
        print(f"响应内容: {json.dumps(result, ensure_ascii=False, indent=2)}")
        
        if response.status_code == 200:
            print(f"\n✓ 任务清理完成")
            return True
        else:
            print(f"\n✗ 任务清理失败")
            return False
            
    except Exception as e:
        print(f"✗ 清理失败: {str(e)}")
        return False

def test_database_query():
    """测试数据库查询接口"""
    print("\n" + "=" * 60)
    print("测试 4: 数据库查询接口")
    print("=" * 60)
    
    try:
        # 查询指定章节的小说（使用测试数据中的 chapter_id=205）
        chapter_id = 205
        response = requests.get(f"{BASE_URL}/api/db/chapters/{chapter_id}/novels")
        
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            novels = response.json()
            print(f"找到 {len(novels)} 条小说记录")
            
            if novels:
                print(f"\n最新的小说记录:")
                latest_novel = novels[0]
                print(f"  ID: {latest_novel.get('id')}")
                print(f"  标题: {latest_novel.get('title')}")
                print(f"  用户ID: {latest_novel.get('user_id')}")
                print(f"  创建时间: {latest_novel.get('create_time')}")
                print(f"  内容长度: {len(latest_novel.get('content', ''))} 字符")
                print(f"\n✓ 数据库查询成功，小说已成功保存到数据库")
                return novels
            else:
                print(f"\n✗ 数据库中没有找到小说记录")
                return []
        else:
            print(f"✗ 查询失败，状态码: {response.status_code}")
            return []
            
    except Exception as e:
        print(f"✗ 查询失败: {str(e)}")
        return []

def test_invalid_requests():
    """测试无效请求"""
    print("\n" + "=" * 60)
    print("测试 5: 无效请求测试")
    print("=" * 60)
    
    # 测试缺少必填参数
    print("\n测试 5.1: 缺少 prompt 参数")
    response = requests.post(
        f"{BASE_URL}/api/novel",
        json={
            "chapter_id": 1,
            "user_id": 1
        }
    )
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    print(f"✓ 正确返回错误" if response.status_code == 400 else "✗ 未正确处理错误")
    
    # 测试缺少 chapter_id 参数
    print("\n测试 5.2: 缺少 chapter_id 参数")
    response = requests.post(
        f"{BASE_URL}/api/novel",
        json={
            "prompt": "生成小说",
            "user_id": 1
        }
    )
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    print(f"✓ 正确返回错误" if response.status_code == 400 else "✗ 未正确处理错误")
    
    # 测试缺少 user_id 参数
    print("\n测试 5.3: 缺少 user_id 参数")
    response = requests.post(
        f"{BASE_URL}/api/novel",
        json={
            "prompt": "生成小说",
            "chapter_id": 1
        }
    )
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    print(f"✓ 正确返回错误" if response.status_code == 400 else "✗ 未正确处理错误")
    
    # 测试查询不存在的任务
    print("\n测试 5.4: 查询不存在的任务")
    response = requests.get(f"{BASE_URL}/api/novel/status/nonexistent-task-id")
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    print(f"✓ 正确返回错误" if response.status_code == 404 else "✗ 未正确处理错误")

def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("小说生成接口测试套件（同步模式）")
    print("=" * 60)
    print(f"后端地址: {BASE_URL}")
    print()
    
    # 测试 1: 小说生成（同步模式，直接返回结果）
    result = test_novel_generation()
    
    # 测试 4: 数据库查询（如果生成成功）
    if result and result.get("status") == "completed":
        test_database_query()
    
    # 测试 2: 任务状态查询（测试向后兼容性）
    # 使用一个假的 task_id 来测试接口是否存在
    test_novel_status("test-task-id-for-compatibility")
    
    # 测试 3: 任务清理
    test_novel_cleanup()
    
    # 测试 5: 无效请求
    test_invalid_requests()
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == "__main__":
    main()
