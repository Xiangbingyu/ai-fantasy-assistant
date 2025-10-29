## 如何使用

### 1. 创建和激活虚拟环境

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 运行后端
```bash
python -m backend.run
```

### 4. 构筑前端项目

```bash
cd frontend
npm install
npm run build
```

### 5. 运行前端
```bash
npm start
```