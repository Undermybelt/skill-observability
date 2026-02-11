# Observability Skill - Quick Start

## 1. Install

```bash
# Copy skill to OpenClaw
cp -r observability-skill ~/.openclaw/workspace/skills/
# Restart gateway or wait for auto-reload
npx openclaw gateway restart
```

## 2. Configure

```bash
# Copy example config
cp ~/.openclaw/workspace/skills/observability-skill/config.example.yaml ~/.openclaw/workspace/observability-skill/config.yaml

# Edit config.yaml - add your Discord webhook if you want alerts
# (optional) nano ~/.openclaw/workspace/observability-skill/config.yaml
```

## 3. Use

```bash
# One-shot check
/observability check

# Start dashboard (auto-refresh every 5s)
/observability dashboard

# Set up alert channel
/observability alert channel discord --webhook "https://discord.com/api/webhooks/..."

# View recent alerts
/observability alerts list --last 24h
```

## 4. CLI Examples

```bash
# Check everything (blocking until all agents respond)
$ npx openclaw observability check
✅ main: reachable (23ms)
✅ dev: reachable (34ms)
✅ apprentice2: reachable (41ms)

# Dashboard
$ npx openclaw observability dashboard
=== OpenClaw Observability Dashboard ===
✅ main        status=reachable   latency=23.45ms
✅ dev         status=reachable   latency=34.12ms
✅ apprentice2 status=reachable   latency=41.78ms

Recent Alerts:
  [critical] Agent dev was unreachable at 2025-02-10T14:30:00Z
```

## 5. Integration with Other Skills

Observability automatically monitors:
- All agent gateways (main, dev, apprentice2)
- Cron job health (if you enable cron metrics collection)
- Memory usage (optional)

When alpha-detection or release-orchestrator emits alerts, they can be routed through observability's central dispatcher.

## 6. Troubleshooting

**No agents showing?**
- Ensure each instance gateway is running and reachable
- Check port numbers in config.yaml match your instances

**Alerts not sending?**
- Set discord/telegram webhook in config
- Test with `/observability alert test`

**Dashboard blank?**
- Run `/observability check` first to collect metrics
- Dashboard shows latest metrics; if none, run a check cycle

---

*Get started in 5 minutes. Keep your agents alive!*
