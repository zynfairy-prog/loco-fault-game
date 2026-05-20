# 机车故障·多岗协同诊断智能体
## 基于生成式 AI 的 HXD3 型电力机车应急处置情景化训练系统

前端交互界面源代码。

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 状态管理 | Zustand v5（reducer 模式） |
| 样式 | Tailwind CSS v4 |
| 路由 | React Router v6 |
| AI 对话 | 扣子（Coze）API — SSE 流式输出 |

---

## 安装与启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（见下方说明）
cp .env.example .env
# 编辑 .env，填入真实的 Token 和 Bot ID

# 3. 启动开发服务器
npm run dev
# 默认访问 http://localhost:5173

# 4. 构建生产包
npm run build
```

---

## 环境变量配置

复制 `.env.example` 为 `.env`，填入以下变量（**不要提交 `.env` 到版本库**）：

| 变量名 | 说明 |
|--------|------|
| `VITE_COZE_API_TOKEN` | 扣子 Personal Access Token，从 https://www.coze.cn/open/oauth/pats 创建，以 `pat_` 开头 |
| `VITE_COZE_BOT_ID` | Bot ID，在扣子 Bot 编辑页 URL 的 `/bot/` 后面那串数字 |
| `VITE_COZE_API_BASE` | API 域名，国内版固定为 `https://api.coze.cn`，无需修改 |

未配置时系统自动进入 **mock 模式**，使用本地预设回复，可用于界面调试。

---

## 项目结构

```
src/
├── pages/                  # 页面组件
│   ├── StartupSetupPage.tsx    # 关卡选择 & 角色配置页
│   ├── DriverScreen.tsx        # 主司机大屏（仪表盘 + AI 对话）
│   └── CoDriverScreen.tsx      # 副司机大屏（机械室视图 + 操作面板）
│
├── components/
│   ├── chat/               # 对话框组件（ChatBox、MessageBubble）
│   ├── dashboard/          # 仪表盘子组件（LED 面板、仪表、故障码列表、操作按钮）
│   ├── codriver/           # 副司机视图（机械室热区图、控制柜 SVG、GS 旋钮）
│   ├── MicroDisplayModal.tsx   # 微机显示屏弹窗（CI 单元监控）
│   └── ScoreDashboard.tsx      # 评分结果页（雷达图 + 维度卡片 + 操作回顾）
│
├── stores/
│   └── dashboardStore.ts   # Zustand 全局状态（reducer 模式）
│
├── hooks/
│   ├── useCozeChat.ts      # 扣子 API 流式对话 hook（含信号解析）
│   └── useBroadcastSync.ts # BroadcastChannel 多窗口状态同步
│
├── lib/
│   ├── coze-api.ts         # 扣子 API 封装（SSE 流式 + mock 模式）
│   ├── signal-parser.ts    # Bot 信号解析（<<LED:...>>、<<METER:...>> 等）
│   └── facts.ts            # GameFacts 序列化（注入 Bot 上下文）
│
└── types/
    └── game-state.ts       # 全局类型定义（GameDashboardState、GameAction 等）
```

---

## 多窗口架构说明

系统支持双屏模式：主司机和副司机分别在独立浏览器窗口运行，通过 `BroadcastChannel` API 实时同步状态。主司机窗口持有 AI 对话连接并广播状态，副司机窗口接收状态更新。

单人模式下，两个视角可在同一窗口内通过按钮切换。
