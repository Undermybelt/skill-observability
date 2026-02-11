# 📊 Observability Skill

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> OpenClaw 多实例统一监控、告警与健康检查基础设施

## 快速开始

```bash
# 1. 复制 skill 到你的 workspace
cp -r observability-skill ~/.openclaw/skills/

# 2. (无需安装依赖，零外部依赖)

# 3. 配置通知渠道 (编辑 config/default.json)
#    - 设置 discord.enabled = true (如果你在 Discord 频道)
#    - 或设置 telegram.enabled = true

# 4. 确保 `openclaw` 命令在 PATH 中
which openclaw  # 应返回路径

# 5. 首次运行
node src/index.js --init

# 6. 查看状态
node src/index.js status
```

## 为什么需要这个？

如果你同时运行 **Main + Dev + Apprentice2** 多个 OpenClaw 实例，你可能会遇到：

- ❌ 不知道某个实例是否还活着
- ❌ Cron 任务失败但直到第二天才发现
- ❌ 没有统一的资源使用视图
- ❌ 告警只能靠手动检查

Observability Skill 专门解决这些问题。

## 核心功能

| 监控项 | 详情 |
|--------|------|
| **Agent 健康** | 所有 session 的在线状态、最后活跃时间、token 消耗 |
| **Cron 健康** | 自动检测 missed runs、任务停滞、启用状态 |
| **系统资源** | 内存、磁盘、负载平均值 |
| **告警通知** | Discord / Telegram 多通道，支持规则和冷却 |
| **CLI 仪表盘** | 类似 `top` 的实时表格视图 |

## 配置

编辑 `config/default.yaml` 或创建 `~/.openclaw/observability.yaml`：

```yaml
# 轮询间隔（秒）
poll_interval: 60

# Discord 告警
channels:
  discord:
    enabled: true   # 设置为 false 禁用

# 告警规则（支持自定义）
rules:
  - id: dev_offline
    condition: 'agent("dev").status !== "online"'
    cooldown: "5m"
    severity: warning
    channel: discord
```

**更多规则示例**:

```yaml
# 高 token 消耗（Main > 100k/hr）
- id: high_token_usage_main
  condition: 'agent("main").token_usage_last_hour > 100000'
  cooldown: "1h"
  severity: warning

# 磁盘使用超过 90%
- id: disk_almost_full
  condition: 'resources.disk_usage_percent > 90'
  cooldown: "30m"
  severity: critical

# 任意 cron  missed
- id: cron_missed
  condition: 'crons.some(c => c.missed_runs > 0)'
  cooldown: "30m"
  severity: warning
```

## 使用场景

### 场景 1：心跳检查

添加到 `HEARTBEAT.md`：

```markdown
## 🔍 Heartbeat Checks

如果 heartbeat.phase === 'monitoring':
  const result = await `observability status`;
  if (result.critical_alerts > 0) {
    await message.send({ channel: 'discord', content: result.summary });
  }
```

### 场景 2：手动状态检查

```bash
# 查看仪表盘
node src/index.js status

# 启动持续监控后台进程（可选）
node src/index.js start
```

### 场景 3：与现有 skill 集成

Alpha Detection 或 Release Orchestrator 在关键操作后可以记录指标：

```javascript
await observability.recordMetric({
  name: 'alpha_detected',
  value: signal.confidence,
  tags: { token: signal.token }
});
```

## 状态持久化

监控数据自动保存到 `data/state.json`，保留最近 30 天（可配置）。

## 规则语法

`condition` 字段支持 JavaScript 表达式，可用变量：

- `agent(name)` - 获取单个 agent 状态
- `agents` - 所有 agents 对象
- `cron(idOrName)` - 获取单个 cron
- `crons` - 所有 cron 数组
- `resources` - 系统资源
- `now`, `minutesAgo(ts)`, `hoursAgo(ts)` - 时间辅助

**示例**:

```javascript
// Main 离线超过 10 分钟且 Apprentice2 也在离线
agent("main").status !== "online" &&
agent("apprentice2").status !== "online" &&
minutesAgo(agent("main").last_seen) > 10
```

## 架构

```
observability-skill/
├── src/
│   ├── monitors/
│   │   ├── agent-health.js    # Agent 健康轮询
│   │   ├── cron-health.js     # Cron 健康检查
│   │   └── resources.js       # 系统资源
│   ├── alerts/
│   │   ├── dispatcher.js      # 告警发送器
│   │   └── rules.js           # 规则引擎 + 冷却
│   ├── dashboard/
│   │   └── cli.js             # 控制台仪表盘
│   └── index.js               # 主入口
├── config/
│   └── default.yaml           # 默认配置
├── data/                      # 状态持久化目录
├── package.json
└── SKILL.md
```

## 开发

```bash
# 安装依赖
npm install

# 运行单次轮询
node src/index.js --init

# 查看仪表盘
node src/index.js status

# 启动持续监控
node src/index.js start
```

## 注意事项

- ✅ 使用 OpenClaw 内置 API，无需额外依赖
- ⚠️ `sessions_list` 和 `session_status` 需要权限
- ⚠️ 资源监控目前主要适配 macOS，Linux 可能需要微调
- ❌ 不支持 Windows（资源命令不同）

## License

MIT © 2026 Dev Apprentice (C-3PO)
