# Observability Skill

> Agent 健康监控、Cron 任务检查、系统资源追踪与告警基础设施

## 概述

Observability Skill 为 OpenClaw 多实例部署提供统一的可观测性层，解决以下痛点：

- 🧠 **Agent 失明**: 不知道 Main/Dev/Apprentice2 是否在线
- ⏰ **Cron 沉默失败**: 任务失败但无人知晓
- 📉 **无指标**: 无法追踪 token 消耗、资源使用
- 🚨 **无告警**: 问题发生后才被动发现

## 核心功能

| 功能 | 描述 | 状态 |
|------|------|------|
| **Agent Health Monitor** | 轮询所有 session 状态 (online/offline, last seen, token usage) | ✅ |
| **Cron Health Checker** | 检测 missed runs、任务停滞、启用状态 | ✅ |
| **Resource Tracker** | 监控内存、磁盘、系统负载 | ✅ |
| **Alert Dispatcher** | 支持 Discord/Telegram 多通道告警 | ✅ |
| **Rules Engine** | 可配置告警规则 + 冷却 (cooldown) | ✅ |
| **CLI Dashboard** | 类似 top 的控制台仪表盘 (表格视图) | ✅ |

## 安装

```bash
# 复制 skill 到你的 skills 目录
cp -r observability-skill ~/.openclaw/skills/

# 安装依赖
cd ~/.openclaw/skills/observability-skill
npm install
```

## 配置

编辑 `config/default.yaml` 或创建 `~/.openclaw/observability.yaml`：

```yaml
poll_interval: 60  # 轮询间隔 (秒)

channels:
  discord:
    enabled: true
  telegram:
    enabled: false

rules:
  - id: session_offline_main
    condition: 'agent("main").status !== "online"'
    cooldown: "5m"
    severity: critical
    channel: discord
```

## 使用方法

### CLI 命令

```bash
# 查看整体状态 (仪表盘)
observability status
# 或
node src/index.js status

# 启动持续监控 (推荐添加到 Heartbeat)
observability start

# 初始化 (首次运行)
observability --init
```

### 与 Heartbeat 集成

在 `HEARTBEAT.md` 的监控阶段添加：

```markdown
## 🔍 Heartbeat Checks

如果 heartbeat.phase === 'monitoring':
  const result = await `observability status`;
  if (result.critical_alerts > 0) {
    await message.send({ channel: 'discord', content: result.summary });
  }
```

### 规则示例

```yaml
# 检测 Dev 离线
- id: dev_offline
  condition: 'agent("dev").status !== "online"'
  cooldown: "5m"
  severity: warning

# 高 token 消耗 (> 100k/hr)
- id: high_token_usage
  condition: 'agent("main").token_usage_last_hour > 100000'
  cooldown: "1h"
  severity: warning

# Cron 任务错过运行
- id: cron_missed
  condition: 'crons.some(c => c.missed_runs > 0)'
  cooldown: "30m"
  severity: warning
```

## 条件表达式语法

规则 `condition` 字段支持 JavaScript 表达式，可用变量：

| 变量 | 类型 | 说明 |
|------|------|------|
| `agent(name)` | Object \| null | 获取指定 agent 状态 |
| `agents` | Object | 所有 agents { name: status } |
| `cron(idOrName)` | Object \| null | 获取指定 cron |
| `crons` | Array | 所有 cron 任务数组 |
| `resources` | Object | 系统资源 (memory, disk, load) |
| `now` | Number | 当前时间戳 |
| `minutesAgo(ts)` | Number | 计算分钟差 |
| `hoursAgo(ts)` | Number | 计算小时差 |

**示例**:

```javascript
// Main 离线超过 5 分钟
agent("main").status !== "online" && minutesAgo(agent("main").last_seen) > 5

// 所有 cron 都正常运行
crons.every(c => c.last_status === "success")

// 磁盘使用 > 90%
resources.disk_usage_percent > 90
```

## 输出示例

```
╔════════════════════════════════════════════════════════════════╗
║         OpenClaw Observability Dashboard                     ║
╚════════════════════════════════════════════════════════════════╝

🧠 Agents:
┌─────────┬──────────┬─────────────┬─────────────┬────────────┐
│ Name    │ Status   │ Last Seen   │ Model       │ Tokens/hr  │
├─────────┼──────────┼─────────────┼─────────────┼────────────┤
│ main    │ 🟢 online│ 1m ago      │ step-3.5    │ 45,000     │
│ dev     │ 🟢 online│ 5m ago      │ pony-alpha  │ 32,000     │
│ appr2   │ 🟢 online│ 8m ago      │ aurora-alpha│ 28,000     │
└─────────┴──────────┴─────────────┴─────────────┴────────────┘

⏰ Cron Jobs:
┌─────────────────────────┬─────────────┬─────────────┬────────┬────────┐
│ Name                    │ Next Run    │ Last Run    │ Status │ Missed │
├─────────────────────────┼─────────────┼─────────────┼────────┼────────┤
│ dev-research-intensive  │ 15:45       │ 14:45 (20m) │ ✅     │ 0      │
│ appr2-review            │ 15:00       │ 14:30 (30m) │ ✅     │ 0      │
│ sop-phase2-review       │ 22:00       │ 10:00 (2h)  │ ✅     │ 0      │
└─────────────────────────┴─────────────┴─────────────┴────────┴────────┘

💾 Resources:
┌──────────┬────────────┐
│ Memory   │ 256 MB     │
│ Disk     │ 45%        │
│ Load Avg │ 1.2, 1.5, 1.8 │
└──────────┴────────────┘

🚨 Active Alerts: 0
```

## 状态持久化

监控状态自动保存到 `data/state.json`：

```json
{
  "timestamp": "2026-02-11T15:30:00Z",
  "agents": { ... },
  "crons": [ ... ],
  "resources": { ... }
}
```

历史数据保留 30 天（自动清理）。

## 扩展：自定义渠道

如需添加新告警渠道 (如 Slack, Webhook)：

1. 在 `src/alerts/channels/` 创建 `slack.js`：

```javascript
async function sendSlackAlert(alert, config) {
  const payload = {
    text: `[${alert.severity}] ${alert.message}`
  };
  // 实现发送逻辑
  return true;
}

module.exports = { sendSlackAlert };
```

2. 更新 `config/default.yaml`:

```yaml
channels:
  slack:
    enabled: true
    webhook_url: "https://hooks.slack.com/..."
```

## 与其它 Skill 集成

### 与 Alpha Detection Skill

Alpha Detection 检测到信号时：

```javascript
if (signal.confidence > 0.8) {
  // 发送到 observability 告警
  await message.send({
    channel: 'discord',
    content: `🚨 Alpha detected: ${signal.token}`
  });
}
```

### 与 Release Orchestrator Skill

Release 前后记录指标：

```javascript
await observability.recordMetric({
  name: 'release_duration',
  value: durationMs,
  tags: { repo: repoName, version: version }
});
```

## 故障排查

### 告警不触发
- 检查规则 `condition` 语法
- 确认 `cooldown` 未阻止（上次触发时间）
- 检查渠道配置是否正确

### 读取不到 session 数据
- 确保证书有 `sessions_list` 和 `session_status` 权限
- 查看网关日志 (`openclaw status`)

### 资源数据不准确
- 不同 OS 命令输出格式不同 (macOS vs Linux)
- 当前实现适配 macOS；Linux 需调整 `extractMemoryMB` 正则

## 开发与测试

```bash
# 单元测试
npm test

# 手动运行单次轮询
node src/index.js --init

# 启动持续监控
node src/index.js start
```

## 技术栈

- **监控**: OpenClaw 内置 API (`sessions_list`, `cron.list`, `session_status`)
- **告警**: `message` tool (Discord/Telegram/WhatsApp)
- **配置**: YAML
- **状态**: JSON 文件持久化
- **仪表盘**: ASCII 表格 (text-table)

## 限制

- ❌ **无 Web Dashboard** (Phase 2 规划)
- ❌ **无历史趋势** (仅当前快照)
- ❌ **无指标导出** (Prometheus format)
- ⚠️ **规则引擎较轻量** (仅支持简单条件表达式)

## Roadmap

- [ ] Phase 2: Web Dashboard (React/Vanilla)
- [ ] Phase 2: 历史数据存储 (SQLite)
- [ ] Phase 2: 图表 (Chart.js)
- [ ] Phase 2: 更多渠道 (Slack, Webhook, Email)
- [ ] Phase 2: 自定义规则 DSL 增强

## 贡献

欢迎 Issue 和 PR！请在 `tests/unit/` 添加测试。

---

*Version: 1.0.0*  
*Author: Dev Apprentice (C-3PO)*  
*License: MIT*
