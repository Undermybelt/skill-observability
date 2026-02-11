# Release Notes - observability-skill v1.0.0

**Release Date**: 2026-02-11  
**Status**: Production  
**Repo**: https://github.com/Undermybelt/skill-observability

## Overview

First release of `observability-skill`, a unified monitoring and alerting solution for OpenClaw multi-agent deployments.

## Features

- **Agent Health Monitoring**: Ping each gateway, measure latency and status
- **Cron Health Checker**: Track cron job success/failure rates and last run times
- **Alert Dispatcher**: Send notifications to Discord, Telegram, email
- **CLI Dashboard**: Real-time text dashboard (5s refresh)
- **5 Built-in Alert Rules**:
  - `agent-down` (critical)
  - `high-latency` (warning)
  - `cron-stuck` (warning)
  - `cron-failure-rate` (warning)
  - `memory-growth` (info)

## Installation

```bash
cp -r observability-skill ~/.openclaw/workspace/skills/
npx openclaw gateway restart

# Optional: configure alerts
cp config.example.yaml config.yaml
# Edit: add discord webhook or telegram bot token
```

## Usage

```bash
# One-shot health check
/observability check

# Live dashboard
/observability dashboard

# Send test alert
/observability alert test --channel discord
```

## MCP Tools

- `observability.check` - Run health check cycle
- `observability.dashboard` - Render dashboard text
- `observability.alert_test` - Send test alert

## Configuration

`observability.yaml` allows customizing agent list, alert channels, rules, and dashboard settings.

## Prometheus Support

Optional `/metrics` endpoint can be enabled for integration with Grafana.

## Why This Matters

Multi-agent OpenClaw systems (Main/Dev/Apprentice2) previously lacked visibility. This skill provides:
- Early detection of agent failures or performance degradation
- Automated alerting without manual polling
- Historical metrics for trend analysis
- Foundation for ops automation

## Future Plans

- [ ] Add cron job metrics collector (interrogate gateway cron API)
- [ ] Support custom metrics from other skills
- [ ] Web-based dashboard (React)
- [ ] Auto-recovery actions (restart agents, escalate)

## Quick Demo

```
$ /observability check
✅ main: reachable (23ms)
✅ dev: reachable (34ms)
✅ apprentice2: reachable (41ms)
```

---

*Stop flying blind. Get observability in 5 minutes.*