## 如何使用

### 1. 构筑后端项目

```bash
cd backend
conda create -n ai-fantasy-assistant python=3.11
conda activate ai-fantasy-assistant
pip install -r requirements.txt
```

### 2. 运行后端
```bash
python run.py
```

### 3. 构筑前端项目

```bash
cd frontend
npm install
npm run build
```

### 4. 运行前端
```bash
npm start
```

## 接口文档

### 基础信息
- DB 路由前缀：`/api/db`
- LLM 路由前缀：`/api`
- 通用请求头：`Content-Type: application/json`

### Worlds
- 方法与路径：GET `/api/db/worlds`
  - 请求示例：
    - GET `http://localhost:5000/api/db/worlds`
  - 响应示例（200 OK）：
    ```json
    [
      {
        "id": 1,
        "user_id": 5,
        "name": "testworld3",
        "tags": ["#test1", "#test2"],
        "is_public": true,
        "worldview": "test1...",
        "master_setting": "test1",
        "origin_world_id": null,
        "create_time": "2025-10-30T12:00:00Z",
        "popularity": 0,
        "main_characters": [
          { "name": "kii", "background": "大力王" },
          { "name": "cap", "background": "闪电侠" }
        ]
      }
    ]
    ```
- 方法与路径：GET `/api/db/worlds/{world_id}`
  - 请求示例：
    - GET `http://localhost:5000/api/db/worlds/12`
  - 响应示例（200 OK）：
    ```json
    {
      "id": 12,
      "user_id": 5,
      "name": "testworld3",
      "tags": ["#test1", "#test2"],
      "is_public": true,
      "worldview": "test1...",
      "master_setting": "test1",
      "origin_world_id": null,
      "create_time": "2025-10-30T12:00:00Z",
      "popularity": 0,
      "main_characters": [
        { "name": "kii", "background": "大力王" },
        { "name": "cap", "background": "闪电侠" }
      ]
    }
    ```

- 方法与路径：POST `/api/db/worlds`
  - 请求示例：
    - POST `http://localhost:5000/api/db/worlds`
    - Body：
      ```json
      {
        "user_id": 5,
        "name": "testworld3",
        "tags": ["#test1", "#test2"],
        "is_public": true,
        "worldview": "test1...",
        "master_setting": "test1",
        "origin_world_id": null,
        "popularity": 0,
        "characters": [
          { "name": "kii", "background": "大力王" },
          { "name": "cap", "background": "闪电侠" }
        ]
      }
      ```
  - 响应示例（201 Created）：
    ```json
    {
      "id": 12,
      "user_id": 5,
      "name": "testworld3",
      "tags": ["#test1", "#test2"],
      "is_public": true,
      "worldview": "test1...",
      "master_setting": "test1",
      "main_characters": [
        { "name": "kii", "background": "大力王" },
        { "name": "cap", "background": "闪电侠" }
      ],
      "origin_world_id": null,
      "create_time": "2025-10-30T12:00:00Z",
      "popularity": 0
    }
    ```

### Chapters
- 方法与路径：GET `/api/db/worlds/{world_id}/chapters`
  - 查询参数：`creator_user_id`（必填，整数）
  - 请求示例：
    - GET `http://localhost:5000/api/db/worlds/12/chapters?creator_user_id=5`
  - 响应示例（200 OK）：
    ```json
    [
      {
        "id": 101,
        "world_id": 12,
        "creator_user_id": 5,
        "name": "第一章",
        "opening": "章节开篇...",
        "background": "世界背景...",
        "is_default": true,
        "origin_chapter_id": null,
        "create_time": "2025-10-30T12:05:00Z"
      }
    ]
    ```
- 方法与路径：GET `/api/db/chapters/{chapter_id}`
  - 请求示例：
    - GET `http://localhost:5000/api/db/chapters/101`
  - 响应示例（200 OK）：
    ```json
    {
      "id": 101,
      "world_id": 12,
      "creator_user_id": 5,
      "name": "第一章",
      "opening": "章节开篇...",
      "background": "世界背景...",
      "is_default": true,
      "origin_chapter_id": null,
      "create_time": "2025-10-30T12:05:00Z"
    }
    ```

- 方法与路径：POST `/api/db/chapters`
  - 请求示例：
    - POST `http://localhost:5000/api/db/chapters`
    - Body：
      ```json
      {
        "world_id": 12,
        "creator_user_id": 5,
        "name": "第一章",
        "opening": "章节开篇...",
        "background": "世界背景...",
        "is_default": true,
        "origin_chapter_id": null,
        "create_time": "2025-10-30T12:05:00Z"
      }
      ```
  - 响应示例（201 Created）：
    ```json
    {
      "id": 101,
      "world_id": 12,
      "creator_user_id": 5,
      "name": "第一章",
      "opening": "章节开篇...",
      "background": "世界背景...",
      "is_default": true,
      "origin_chapter_id": null,
      "create_time": "2025-10-30T12:05:00Z"
    }
    ```

### Messages
- 方法与路径：GET `/api/db/chapters/{chapter_id}/messages`
  - 请求示例：
    - GET `http://localhost:5000/api/db/chapters/101/messages`
  - 响应示例（200 OK）：
    ```json
    [
      {
        "id": 1001,
        "chapter_id": 101,
        "user_id": 5,
        "role": "user",
        "content": "你好，世界！",
        "create_time": "2025-10-30T12:06:00Z"
      },
      {
        "id": 1002,
        "chapter_id": 101,
        "user_id": 5,
        "role": "ai",
        "content": "你好，很高兴见到你。",
        "create_time": "2025-10-30T12:06:05Z"
      }
    ]
    ```

- 方法与路径：POST `/api/db/chapters/{chapter_id}/messages`
  - 请求示例：
    - POST `http://localhost:5000/api/db/chapters/101/messages`
    - Body：
      ```json
      {
        "user_id": 5,
        "role": "user",
        "content": "请继续讲述世界观的历史。",
        "create_time": "2025-10-30T12:06:00Z"
      }
      ```
  - 响应示例（201 Created）：
    ```json
    {
      "id": 1003,
      "chapter_id": 101,
      "user_id": 5,
      "role": "user",
      "content": "请继续讲述世界观的历史。",
      "create_time": "2025-10-30T12:06:00Z"
    }
    ```

- 方法与路径：DELETE `/api/db/chapters/{chapter_id}/messages?id={message_id}`
  - 请求示例（查询参数方式）：
    - DELETE `http://localhost:5000/api/db/chapters/101/messages?id=1002`
  - 请求示例（JSON 体方式）：
    - DELETE `http://localhost:5000/api/db/chapters/101/messages`
    - Body：
      ```json
      { "id": 1002 }
      ```
  - 响应示例（200 OK）：
    ```json
    {
      "message": "成功删除2条消息",
      "deleted_count": 2,
      "chapter_id": 101,
      "target_id": 1002
    }
    ```

### Novels
- 方法与路径：GET `/api/db/chapters/{chapter_id}/novels`
  - 请求示例：
    - GET `http://localhost:5000/api/db/chapters/101/novels`
  - 响应示例（200 OK）：
    ```json
    [
      {
        "id": 5001,
        "chapter_id": 101,
        "user_id": 5,
        "title": "序章",
        "content": "从前，在一个神秘的世界...",
        "create_time": "2025-10-30T12:07:00Z"
      }
    ]
    ```

- 方法与路径：POST `/api/db/chapters/{chapter_id}/novels`
  - 请求示例：
    - POST `http://localhost:5000/api/db/chapters/101/novels`
    - Body：
      ```json
      {
        "user_id": 5,
        "content": "第一章：帝都的黄昏，阴谋渐起……",
        "title": "帝都的黄昏",
        "create_time": "2025-10-30T12:07:00"
      }
      ```
  - 响应示例（201 Created）：
    ```json
    {
      "id": 6001,
      "chapter_id": 101,
      "user_id": 5,
      "title": "帝都的黄昏",
      "content": "第一章：帝都的黄昏，阴谋渐起……",
      "create_time": "2025-10-30T12:07:00Z"
    }
    ```


### User-Worlds
- 方法与路径：GET `/api/db/user-worlds`
  - 请求示例：
    - GET `http://localhost:5000/api/db/user-worlds?user_id=5&role=creator`
  - 响应示例（200 OK）：
    ```json
    [
      {
        "id": 777,
        "user_id": 5,
        "world_id": 12,
        "role": "creator",
        "create_time": "2025-10-30T12:10:00Z"
      }
    ]
    ```
- 方法与路径：POST `/api/db/user-worlds`
  - 请求示例：
    - POST `http://localhost:5000/api/db/user-worlds`
    - Body：
      ```json
      {
        "user_id": 5,
        "world_id": 12,
        "role": "participant",
        "create_time": "2025-10-30T12:10:00Z"
      }
      ```
  - 响应示例（201 Created）：
    ```json
    {
      "id": 888,
      "user_id": 5,
      "world_id": 12,
      "role": "participant",
      "create_time": "2025-10-30T12:10:00Z"
    }
    ```

### Auth
- 方法与路径：POST `/api/db/auth`
  - 请求示例（注册或登录）：
    - POST `http://localhost:5000/api/db/auth`
    - Body：
      ```json
      { "username": "alice", "password": "secret" }
      ```
  - 响应示例：
    - 新用户注册成功（201 Created）：
      ```json
      { "user_id": 9 }
      ```
    - 已有用户登录成功（200 OK）：
      ```json
      { "user_id": 5 }
      ```
    - 密码错误（401 Unauthorized）：
      ```json
      { "error": "密码错误" }
      ```

### LLM
- 方法与路径：POST `/api/chat`
  - 请求示例：
    - POST `http://localhost:5000/api/chat`
    - Body：
      ```json
      {
        "worldview": "宏大的奇幻世界观设定……",
        "master_sitting": "整体设定与基调，例如黑暗奇幻、蒸汽朋克……",
        "main_characters": [
          { "name": "Kii", "background": "大力王" },
          { "name": "Cap", "background": "闪电侠" }
        ],
        "background": "第一章：帝都的黄昏，阴谋渐起……",
        "messages": [
          { "role": "system", "content": "你是一个奇幻世界创作助手，帮助完善世界观设定。" },
          { "role": "user", "content": "我们先设定魔法体系的基本原则" }
        ]
      }
      ```
  - 响应示例（200 OK）：
    ```json
    { "response": "你好，很高兴为你服务！" }
    ```

- 方法与路径：POST `/api/chat/suggestions`
  - 请求示例：
    - POST `http://localhost:5000/api/chat/suggestions`
    - Body：
      ```json
      {
        "worldview": "宏大的奇幻世界观设定……",
        "master_sitting": "整体设定与基调，例如黑暗奇幻、蒸汽朋克……",
        "main_characters": [
          { "name": "Kii", "background": "大力王" },
          { "name": "Cap", "background": "闪电侠" }
        ],
        "background": "第一章：帝都的黄昏，阴谋渐起……",
        "messages": [
          { "role": "system", "content": "你是一个奇幻世界创作助手，帮助完善世界观设定。" },
          { "role": "user", "content": "我们先设定魔法体系的基本原则" },
          { "role": "ai", "content": "好的，你希望魔法受哪些限制？" }
        ]
      }
      ```
  - 响应示例（200 OK）：
    ```json
    {
      "suggestions": [
        { "content": "魔法需消耗能量，如体力或法力值。" },
        { "content": "不同职业掌握的魔法学派各有优劣。" },
        { "content": "过度施法会产生副作用，比如精神恍惚。" },
        { "content": "魔法效果受材料、阵式与环境影响。" },
        { "content": "学习魔法需要导师与严格的学术体系。" },
        { "content": "禁忌魔法存在，但代价极其高昂。" }
      ]
    }
    ```
  - 回退示例（模型未按 JSON 输出）：
    ```json
    { "raw": "[可能为纯文本的建议，请自行解析]" }
    ```

- 方法与路径：POST `/api/novel`
  - 请求示例：
    - POST `http://localhost:5000/api/novel`
    - Body：
      ```json
      {
        "prompt": "以星际为背景，写一段冒险故事，主角勇敢机智。",
        "worldview": "星际文明分层，跃迁门连接各星域……",
        "master_sitting": "硬核科幻与冒险融合，略带史诗格调",
        "main_characters": [
          { "name": "艾文", "background": "年轻的跃迁机师，勇敢机智" }
        ],
        "background": "序章：边境空间站遭遇异常能量风暴"
      }
      ```
  - 响应示例（200 OK）：
    ```json
    {
      "response": "在璀璨的星河背后，勇敢的机师踏上了未知的航程……"
    }
    ```