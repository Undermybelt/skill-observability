# 🚨 Observability Skill

> **Unified Monitoring & Alerting for OpenClaw Multi-Agent Systems**

[![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-blue)](https://clawhub.com)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🎯 Problem It Solves

When running multiple OpenClaw agents (Main, Dev, Apprentice2), you lose visibility:
- Is Dev actually running research every 30 min?
- Did Apprentice2's last heartbeat fail?
- Are any agents hung or slow?
- Are cron tasks completing successfully?

Without monitoring, you're **blind**. Observability skill gives you eyes.

## ✨ Features

- **Agent Health Monitor**: Pings each gateway, measures latency, status
- **Cron Health Checker**: Tracks cron job success/failure rates, last run times
- **Alert Dispatcher**: Sends notifications to Discord, Telegram, email
- **CLI Dashboard**: Real-time text dashboard (updates every 5s)
- **5 Built-in Alert Rules**: agent-down, high-latency, cron-stuck, cron-failure-rate, memory-growth
- **Prometheus Exporter** (optional): `/metrics` endpoint for Grafana

## ⚡ Quick Start

```bash
# 1. Install
cp -r observability-skill ~/.openclaw/workspace/skills/
npx openclaw gateway restart

# 2. Configure (optional, defaults work out of box)
cp config.example.yaml config.yaml
# Edit: set discord webhook if you want alerts

# 3. Run health check
/observability check

# 4. Start dashboard
/observability dashboard
```

## 📊 Dashboard Output

```
=== OpenClaw Observability Dashboard ===
✅ main        status=reachable   latency=23ms
✅ dev         status=reachable   latency=34ms
✅ apprentice2 status=reachable   latency=41ms

Recent Alerts:
  [critical] Agent dev was unreachable at 14:30Z
```

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `/observability check` | Run one health check cycle |
| `/observability dashboard` | Start live updating dashboard |
| `/observability cron status` | Show cron job health |
| `/observability alerts list --last 24h` | Show recent alerts |
| `/observability alert test --channel discord` | Send test alert |
| `/observability metrics export --format prometheus` | Export metrics |

## 🔔 Alert Rules (Default)

| Rule | Condition | Severity |
|------|-----------|----------|
| `agent-down` | agent not reachable | critical |
| `high-latency` | latency > 5000ms | warning |
| `cron-stuck` | last run > 2x interval | warning |
| `cron-failure-rate` | failures > 20% last hour | warning |
| `memory-growth` | memory growth > 50% in 1h | info |

Customize in `config.yaml`.

## 📦 Integration

Other skills can emit metrics:

```javascript
// Inside alpha-detection or release-orchestrator
observability.emit("skill.success", 1, {"skill": "alpha-detection"})
observability.emit("pipeline.latency", 12000)  # ms
```

These become available for custom alert rules.

## 🛠️ For Ops

### Prometheus Export

Enable in `config.yaml`:
```yaml
prometheus:
  enabled: true
  port: 9090
```

Then scrape `http://localhost:9090/metrics` with Prometheus + Grafana.

### Multi-Instance

The skill runs within Main instance but monitors all configured agents (main, dev, apprentice2). Just ensure Main can reach each agent's gateway (ports 18789, 19001, 19002).

## 📈 SEO Keywords

`observability`, `monitoring`, `alerting`, `multi-agent`, `openclaw`, `cron health`, `agent monitoring`, `ops for AI agents`, `reliability`

## 🤝 Contribute

PRs welcome: https://github.com/Undermybelt/skill-observability

## 📄 License

MIT - Keep your agents alive!

---

**Stop flying blind. Get observability in 5 minutes.**

*Created: 2026-02-11 (P0 from Dev research)*
*MVP: ~250 lines Python*
*Status: Ready for beta*
