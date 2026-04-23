# AI Skills 助手系统

一个基于 AI 模型的技能执行系统，允许用户通过自然语言对话来执行各种任务，如代码操作、服务器管理、系统命令执行等。

## 项目简介

AI Skills 是一个智能助手系统，它通过集成 AI 模型（如 NVIDIA API）来理解用户意图，并调用预定义的"技能"来执行具体任务。系统采用模块化设计，支持动态扩展技能。

## 核心特性

- 🤖 **AI 驱动**：基于大语言模型理解用户意图
- 🛠️ **技能系统**：模块化的技能设计，支持动态添加/删除
- 🔐 **用户认证**：完整的登录/会话管理系统
- 🌐 **Web 界面**：提供友好的 Web 交互界面
- 🔄 **流式响应**：支持实时流式输出和工具调用进度展示
- 🚀 **服务器管理**：可启动/停止后台服务
- 📦 **热更新**：配置文件修改无需重启即可生效

## 技术栈

- **后端框架**: Node.js + Express 5
- **认证**: express-session + bcryptjs
- **HTTP 客户端**: axios
- **AI 模型**: NVIDIA API (支持多种模型切换)
- **前端**: 原生 HTML/CSS/JavaScript

## 项目结构

```
aiskills/
├── app.js                      # 应用入口文件
├── package.json                # 项目配置和依赖
├── assistant.config.json       # AI 模型配置
├── skills.json                 # 技能定义配置
├── users.json                  # 用户数据
├── processes.json              # 后台进程记录
├── server/                     # 服务端核心模块
│   ├── banner.js              # 启动横幅
│   ├── constants.js           # 常量定义
│   ├── state.js               # 运行时状态管理
│   ├── middleware/            # 中间件
│   │   └── auth.js           # 认证中间件
│   ├── routes/                # 路由
│   │   ├── auth-routes.js    # 认证路由
│   │   ├── api-routes.js     # API 路由
│   │   └── page-routes.js    # 页面路由
│   ├── services/              # 服务层
│   │   ├── auth-service.js   # 认证服务
│   │   ├── chat-service.js   # 聊天服务
│   │   └── config-service.js # 配置服务
│   └── utils/                 # 工具类
│       └── json-store.js     # JSON 文件存储工具
├── skills/                     # 技能实现模块
│   ├── index.js              # 技能管理器
│   ├── execute-command.js    # 命令执行技能
│   ├── start-server.js       # 启动服务器技能
│   ├── stop-server.js        # 停止服务器技能
│   ├── list-servers.js       # 列出服务器技能
│   ├── add-skill.js          # 添加技能
│   ├── remove-skill.js       # 删除技能
│   ├── generate-image.js     # 图像生成技能
│   ├── get-weather.js        # 天气查询技能
│   └── ... (其他技能)
├── public/                     # 前端静态资源
│   ├── index.html            # 主页面
│   ├── login.html            # 登录页面
│   ├── css/                  # 样式文件
│   │   ├── style.css
│   │   └── login.css
│   └── js/                   # 前端脚本
│       ├── app.js
│       └── login.js
└── generated_images/           # 生成的图片存储目录
```

## 技能系统

### 内置技能

系统预置了以下技能：

| 技能名称 | 描述 |
|---------|------|
| `execute_command` | 执行系统命令，用于文件操作、系统信息获取等 |
| `start_server` | 启动后台服务器程序 |
| `stop_server` | 停止后台运行的服务器 |
| `list_servers` | 列出所有运行中的服务器 |
| `add_skill` | 动态添加新技能到系统中 |
| `remove_skill` | 从系统中删除技能 |
| `generate_image` | 生成图像 |
| `get_weather` | 获取天气信息 |
| `get_stock_quotes` | 获取股票行情 |
| `read_code` | 读取代码文件 |
| `write_code` | 写入/修改代码文件 |
| `list_code` | 列出代码文件 |
| `run_code` | 运行代码 |
| `list_skill_templates` | 列出技能模板 |

### 技能定义格式

每个技能在 `skills.json` 中定义，包含：

```json
{
  "name": "技能名称",
  "description": "技能描述",
  "when_to_use": "使用场景说明",
  "parameters": [
    {
      "name": "参数名",
      "type": "参数类型",
      "description": "参数描述"
    }
  ]
}
```

## 安装与运行

### 前置要求

- Node.js (推荐 v16+)
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 配置

编辑 `assistant.config.json` 配置 AI 模型：

```json
{
  "apiUrl": "https://integrate.api.nvidia.com/v1/chat/completions",
  "apiKey": "你的 API 密钥",
  "currentModel": "选择的模型",
  "availableModels": ["模型列表"]
}
```

### 启动应用

```bash
npm start
```

默认访问地址：http://localhost:3615

## API 接口

### 认证相关

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/status` - 获取认证状态

### 聊天相关

- `POST /api/chat` - 发送聊天消息
- `POST /api/chat/stream` - 流式聊天（支持工具调用）

### 配置相关

- `GET /api/config` - 获取配置
- `POST /api/config` - 更新配置

### 服务器管理

- `GET /api/servers` - 获取运行中的服务器列表
- `POST /api/servers/start` - 启动服务器
- `POST /api/servers/stop` - 停止服务器

## 用户管理

### 默认用户

系统首次启动时会自动创建默认管理员账户：

- 用户名：`admin`
- 密码：`admin123`

**建议首次登录后立即修改密码**

### 用户数据存储

用户信息存储在 `users.json` 文件中，包含用户名和密码哈希。

## 配置说明

### assistant.config.json

- `apiUrl`: AI 模型 API 地址
- `apiKey`: API 密钥
- `currentModel`: 当前使用的模型
- `availableModels`: 可用模型列表

### skills.json

定义所有可用技能的配置，包括技能名称、描述、参数等。

### processes.json

记录后台运行的服务器进程信息。

## 开发指南

### 添加新技能

1. 在 `skills/` 目录下创建新的技能文件
2. 在 `skills.json` 中添加技能定义
3. 技能会自动加载，无需重启系统

### 技能开发模板

```javascript
// skills/your-skill.js
module.exports = async function yourSkillName(params) {
   // 实现技能逻辑
   return {
      success: true,
      result: '执行结果'
   };
};
```

## 安全注意事项

1. **API 密钥保护**: 不要将 `assistant.config.json` 提交到版本控制系统
2. **密码安全**: 用户密码使用 bcrypt 加密存储
3. **会话管理**: 使用 express-session 管理用户会话
4. **命令执行**: 技能中的命令执行需要谨慎处理，避免注入攻击

## 常见问题

### Q: 如何修改默认端口？

A: 设置环境变量 `PORT` 或修改 `app.js` 中的端口配置。

### Q: 配置文件修改后需要重启吗？

A: `assistant.config.json`、`skills.json`、`users.json` 等配置文件修改后会自动生效，无需重启。但修改 `skills/*.js` 代码文件需要重启。

### Q: 如何查看运行日志？

A: 启动时会在控制台输出日志，包括服务器状态、技能加载情况等。

## 许可证

ISC License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。
