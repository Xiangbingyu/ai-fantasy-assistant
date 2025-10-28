## 如何使用

### 1. 创建和激活虚拟环境

```bash
# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
```

### 2. 安装依赖

```bash
# 安装项目依赖
pip install -r requirements.txt
```

### 3. 运行项目

```bash
python -m backend.run
cd frontend
npm install
npm run build
npm start
```
