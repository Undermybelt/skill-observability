# Observability Skill v1.0.0

> Unified monitoring and alerting for OpenClaw multi-agent systems

**Status**: Production Ready ✅

## 功能
为 OpenClaw 多实例部署提供统一监控、健康检查和告警分发：
- Agent Health Monitor（进程、内存、响应时间）
- Cron Health Checker（任务执行成功率、延迟）
- Alert Dispatcher（Discord/Telegram/邮件）
- CLI Dashboard（实时状态概览）
- 5+ 内置告警规则（阈值、异常检测）

## 使用场景
- 主师傅监控 Dev/Apprentice2 状态
- 自动发现宕机或性能退化
- 告警通知（无需人工轮询）
- 历史指标分析（识别趋势）

## 命令

```bash
# 初始化监控配置
/observability init --discord-webhook <url> --telegram-bot <token>

# 查看实时仪表盘
/observability dashboard

# 检查单个 agent 健康
/observability health check --agent dev

# 查看 cron 任务状态
/observability cron status

# 告警历史
/observability alerts list --last 24h

# 测试告警
/observability alert test --channel discord

# 配置告警规则
/observability rules add --name "agent-down" --condition "agent.status != 'running'" --severity critical
/observability rules add --name "cron-failure-rate" --condition "cron.failure_rate > 0.2" --severity warning

# 导出指标（Prometheus 格式）
/observability metrics export --format prometheus
```

## 配置

`observability.yaml`:

```yaml
agents:
  - name: main
    port: 18789
  - name: dev
    port: 19001
  - name: apprentice2
    port: 19002

cron:
  check_interval: "30s"  # 健康检查频率
  history_retention: "7d" # 保留历史

alerts:
  channels:
    discord: "https://discord.com/api/webhooks/..."
    telegram: "bot_token:chat_id"
    email: "admin@example.com"
  rules:
    - name: agent-down
      condition: "agent.status != 'running'"
      severity: critical
      cooldown: "5m"
    - name: high-latency
      condition: "agent.latency > 5000"  # ms
      severity: warning

dashboard:
  refresh_interval: 5  # seconds
  theme: "dark"  # or "light"
```

## 架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Main Gateway  │    │   Dev Gateway    │    │ Apprentice2 GW  │
│   (18789)       │    │   (19001)        │    │   (19002)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────────────────┐
                    │  Observability Skill    │
                    │  (central collector)    │
                    └─────────────────────────┘
                                 │
                  ┌──────────────┴──────────────┐
                  │                             │
            ┌─────────────┐           ┌─────────────┐
            │   CLI       │           │   Alerts    │
            │ Dashboard   │           │  Discord/   │
            │             │           │  Telegram   │
            └─────────────┘           └─────────────┘
```

## 指标收集

- **Agent Health**: reachable, latency, uptime%, process memory
- **Cron Health**: last run time, success/failure count, duration
- **System Resources**: CPU, memory (if permitted)
- **Custom Metrics**: any skill can emit via `observability.emit(name, value)`

## 集成

与现有 skill 协同：
- **alpha-detection**: 告警失败可路由到 observability
- **release-orchestrator**: 监控发布流水线成功率
- **memory-infrastructure**: 监控 qmd 索引延迟

## 依赖
- OpenClaw Gateway reachable on each agent port
- Python 3.8+ (if running as separate service) or Node.js wrapper
- Optional: Prometheus exporter for external monitoring

## ⚠️ 注意
- 需要网络访问各 agent 的 gateway 端口
- 告警规则建议从默认开始，逐步调优
- Dashboard 适合终端查看，不适合大规模集群（使用 Prometheus+Grafana 替代）

---

*Skill: observability*
*Priority: P0 (from Dev 2026-02-11 16:45)*
*MVP: 3-4 hours, 200-300 lines*
*Version: 1.0.0*
*Status: Released*
*Repo: https://github.com/Undermybelt/skill-observability*
*Estimated impact: High*
