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
- 后端基础地址：`http://localhost:5000`
- DB 路由前缀：`/api/db`
- LLM 路由前缀：`/api`
- 通用请求头：`Content-Type: application/json`

---

### Worlds
- 方法与路径：GET `/api/db/worlds`
  - 功能：获取所有世界
  - 请求参数：无
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
  - 功能：按 ID 获取单个世界详情（含角色）
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
  - 错误示例（404 Not Found）：
    ```json
    { "error": "世界不存在" }
    ```

- 方法与路径：POST `/api/db/worlds`
  - 功能：创建世界（可同时创建角色）
  - 请求体字段：
    - `user_id` number
    - `name` string
    - `tags` string[]（建议数组）
    - `is_public` boolean
    - `worldview` string
    - `master_setting` string
    - `origin_world_id` number | null
    - `popularity` number
    - `characters?` `{ name: string; background: string }[]`（可选，同步创建角色）
    - 说明：当前实现中 `create_time` 由后端自动生成，忽略请求体同名字段
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

---

### Chapters
- 方法与路径：GET `/api/db/worlds/{world_id}/chapters`
  - 功能：按世界和创建者获取章节
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
  - 错误示例（缺少查询参数，400 Bad Request）：
    ```json
    { "error": "缺少creator_user_id参数" }
    ```
- 方法与路径：GET `/api/db/chapters/{chapter_id}`
  - 功能：按 ID 获取单个章节详情
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
  - 错误示例（404 Not Found）：
    ```json
    { "error": "章节不存在" }
    ```

- 方法与路径：POST `/api/db/chapters`
  - 功能：创建章节
  - 请求体字段：
    - `world_id` number
    - `creator_user_id` number
    - `name` string
    - `opening` string
    - `background` string
    - `is_default` boolean
    - `origin_chapter_id` number | null
    - `create_time?` string（可选，ISO8601；不传则后端按默认生成）
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

---

### Messages
- 方法与路径：GET `/api/db/chapters/{chapter_id}/messages`
  - 功能：获取章节下的所有对话消息
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
  - 功能：创建对话消息
  - 请求体字段：
    - `user_id` number（必填）
    - `role` `'user' | 'ai'`（必填）
    - `content` string（必填）
    - `create_time?` string（可选，ISO8601；不传则后端使用当前 UTC 时间）
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
  - 错误示例（缺少字段，400 Bad Request）：
    ```json
    { "error": "缺少user_id参数" }
    ```
  - 错误示例（role 非法，400 Bad Request）：
    ```json
    { "error": "role必须为\"user\"或\"ai\"" }
    ```
  - 错误示例（时间格式错误，400 Bad Request）：
    ```json
    { "error": "时间格式错误: Invalid isoformat string: ..." }
    ```

- 方法与路径：DELETE `/api/db/chapters/{chapter_id}/messages?id={message_id}`
  - 功能：删除指定章节下 ID 大于等于 `id` 的消息（批量删）
  - 请求参数：
    - `id` number（必填，可通过查询参数或 JSON 体传递）
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
  - 错误示例（缺少参数，400 Bad Request）：
    ```json
    { "error": "缺少id参数" }
    ```
---

### Novels
- 方法与路径：GET `/api/db/chapters/{chapter_id}/novels`
  - 功能：获取章节下的所有小说记录
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
  - 功能：创建章节下的小说记录
  - 请求体字段：
    - `user_id` number（必填）
    - `content` string（必填）
    - `title?` string（可选）
    - `create_time?` string（可选，ISO8601；不传则后端使用当前 UTC 时间）
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
  - 错误示例（缺少字段，400 Bad Request）：
    ```json
    { "error": "缺少user_id参数" }
    ```
  - 错误示例（时间格式错误，400 Bad Request）：
    ```json
    { "error": "时间格式错误: Invalid isoformat string: ..." }
    ```

---

### User-Worlds
- 方法与路径：GET `/api/db/user-worlds`
  - 功能：按用户与角色关系获取世界关联
  - 查询参数：
    - `user_id` number
    - `role` `'creator' | 'participant' | 'viewer'`
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
  - 错误示例（缺少参数或角色不合法，400 Bad Request）：
    ```json
    { "error": "缺少user_id或role参数" }
    ```
    或
    ```json
    { "error": "无效的role值" }
    ```
- 方法与路径：POST `/api/db/user-worlds`
  - 功能：创建用户与世界的关联关系
  - 请求体字段：
    - `user_id` number（必填）
    - `world_id` number（必填）
    - `role` `'creator' | 'participant' | 'viewer'`（必填）
    - `create_time?` string（可选，ISO8601；不传则后端使用当前 UTC 时间）
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
  - 错误示例（缺少参数或角色不合法，400 Bad Request）：
    ```json
    { "error": "缺少user_id或world_id或role参数" }
    ```
    或
    ```json
    { "error": "无效的role值" }
    ```
  - 错误示例（时间格式错误，400 Bad Request）：
    ```json
    { "error": "时间格式错误: Invalid isoformat string: ..." }
    ```

---

### Auth
- 方法与路径：POST `/api/db/auth`
  - 功能：注册或登录
  - 请求体：`username` string, `password` string
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

---

### LLM
- 方法与路径：POST `/api/chat`
  - 功能：通用对话生成
  - 附加上下文字段（可选，用于增强上下文，后端将以第二条 system 消息注入模型）：
    - `worldview` string
    - `master_sitting` string
    - `main_characters` 可以为：
      - `[{ name: string; background?: string }...]`（推荐）
      - 或 `string[]`、或单个对象/字符串（后端会兼容并序列化）
    - `background` string（章节或场景背景）
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
  - 功能：基于历史对话生成 6 条下一条回复建议
  - 附加上下文字段（可选，含义同 `/api/chat`）：
    - `worldview`、`master_sitting`、`main_characters`、`background`
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
  - 功能：根据提示生成小说
  - 附加上下文字段（可选，后端将以第二条 system 消息注入模型）：
    - `worldview`、`master_sitting`、`main_characters`、`background`
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