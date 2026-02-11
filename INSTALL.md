# 安装指南：observability-skill

## 前置要求

- OpenClaw ≥ 0.5.0
- Node.js ≥ 18
- 权限: `sessions_list`, `session_status`, `cron.list`, `message.send`

## 步骤 1: 复制文件

```bash
cd ~/.openclaw/workspace/skills
# 如果已存在先删除
rm -rf observability-skill
# 复制新技能
cp -r /path/to/observability-skill .
```

## 步骤 2: 安装依赖

```bash
cd ~/.openclaw/skills/observability-skill
npm install
```

## 步骤 3: 配置通知渠道

编辑 `config/default.yaml`：

```yaml
channels:
  discord:
    enabled: true  # 如果使用 Discord 通知
  telegram:
    enabled: false # 如果使用 Telegram，设置为 true 并配置 chat_id
```

确保网关已配置对应 channel 的 token（在 `~/.openclaw/openclaw.json` 中）：

```json
{
  "channels": {
    "discord": { "token": "YOUR_DISCORD_BOT_TOKEN" },
    "telegram": { "token": "YOUR_TELEGRAM_BOT_TOKEN" }
  }
}
```

## 步骤 4: 首次运行

```bash
# 初始化并显示仪表盘
node src/index.js --init

# 或只查看状态
node src/index.js status
```

## 步骤 5: 集成 Heartbeat (推荐)

编辑 `~/.openclaw/workspace/HEARTBEAT.md`，在监控阶段添加：

```markdown
## 🔍 检查内容

如果 heartbeat.phase === 'monitoring':
  运行: `observability status`
  如果检测到严重告警，立即通知 Discord
```

## 验证

启动后检查：

- ✅ 仪表盘显示所有 3 个 agent (main, dev, apprentice2)
- ✅ Cron 任务列表完整
- ✅ 资源数据正确
- ✅ 离线检测告警触发（可临时关闭一个 instance 测试）

## 故障排查

| 问题 | 解决 |
|------|------|
| `sessions_list` 权限错误 | 检查网关配置文件 `openclaw.json`，确保有 `sessions` 权限 |
| 告警不发送 | 确认 `channels.discord.enabled: true` 且网关 token 正确 |
| 资源数据 N/A | 资源命令适配你的 OS，可能需要修改 `src/monitors/resources.js` |
| 规则不触发 | 检查 `condition` 语法（在配置文件里加引号） |

## 卸载

```bash
rm -rf ~/.openclaw/skills/observability-skill
# 同时删除配置
rm ~/.openclaw/observability.yaml 2>/dev/null || true
```

---

*Version 1.0.0*  
*Skill ID: observability-skill*
