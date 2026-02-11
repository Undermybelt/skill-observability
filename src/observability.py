#!/usr/bin/env python3
"""
Observability Skill Core - Minimal MVP
Monitors OpenClaw agents and cron jobs, dispatches alerts.
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import aiohttp  # pip install aiohttp

class ObservabilitySkill:
    def __init__(self, config_path: str = "~/.openclaw/workspace/observability-skill/config.yaml"):
        self.config = self._load_config(config_path)
        self.session: Optional[aiohttp.ClientSession] = None
        self.alerts: List[Dict] = []

    def _load_config(self, path: str) -> Dict:
        # 简化：硬编码默认配置，实际应从 YAML 读取
        return {
            "agents": [
                {"name": "main", "port": 18789},
                {"name": "dev", "port": 19001},
                {"name": "apprentice2", "port": 19002}
            ],
            "alerts": {
                "channels": {"discord": "", "telegram": ""},
                "rules": [
                    {"name": "agent-down", "condition": "status != 'reachable'", "severity": "critical"},
                    {"name": "high-latency", "condition": "latency > 5000", "severity": "warning"}
                ]
            }
        }

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def check_agent(self, agent: Dict) -> Dict:
        """Check a single agent's health via gateway status"""
        url = f"http://127.0.0.1:{agent['port']}/status"
        start = time.time()
        try:
            async with self.session.get(url, timeout=5) as resp:
                latency = (time.time() - start) * 1000
                if resp.status == 200:
                    return {
                        "agent": agent["name"],
                        "status": "reachable",
                        "latency_ms": round(latency, 2),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    return {
                        "agent": agent["name"],
                        "status": "unreachable",
                        "latency_ms": None,
                        "timestamp": datetime.utcnow().isoformat()
                    }
        except Exception as e:
            return {
                "agent": agent["name"],
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    async def check_all_agents(self) -> List[Dict]:
        """Check all configured agents in parallel"""
        tasks = [self.check_agent(agent) for agent in self.config["agents"]]
        return await asyncio.gather(*tasks)

    def evaluate_rules(self, metrics: List[Dict]) -> List[Dict]:
        """Evaluate alert rules against current metrics"""
        alerts_triggered = []
        for metric in metrics:
            # Rule: agent-down
            if metric["status"] != "reachable":
                alerts_triggered.append({
                    "rule": "agent-down",
                    "agent": metric["agent"],
                    "severity": "critical",
                    "message": f"Agent {metric['agent']} is unreachable"
                })
            # Rule: high-latency
            if metric.get("latency_ms") and metric["latency_ms"] > 5000:
                alerts_triggered.append({
                    "rule": "high-latency",
                    "agent": metric["agent"],
                    "severity": "warning",
                    "message": f"Agent {metric['agent']} latency {metric['latency_ms']}ms exceeds 5s threshold"
                })
        return alerts_triggered

    async def dispatch_alert(self, alert: Dict):
        """Send alert to configured channels (Discord/Telegram)"""
        # TODO: Implement actual HTTP POST to webhooks
        print(f"[ALERT] {alert['severity'].upper()}: {alert['message']}")
        self.alerts.append(alert)

    async def run_cycle(self):
        """Execute one monitoring cycle"""
        metrics = await self.check_all_agents()
        alerts = self.evaluate_rules(metrics)
        for alert in alerts:
            await self.dispatch_alert(alert)
        return metrics

    def render_dashboard(self, metrics: List[Dict]) -> str:
        """Render simple text dashboard"""
        lines = ["=== OpenClaw Observability Dashboard ===", ""]
        for m in metrics:
            status_icon = "✅" if m["status"] == "reachable" else "❌"
            latency = f"{m.get('latency_ms', 'N/A')}ms" if m.get("latency_ms") else "N/A"
            lines.append(f"{status_icon} {m['agent']:12} status={m['status']:10} latency={latency}")
        lines.append("")
        if self.alerts:
            lines.append("Recent Alerts:")
            for a in self.alerts[-5:]:
                lines.append(f"  [{a['severity']}] {a['message']}")
        return "\n".join(lines)

# Convenience functions for OpenClaw integration
async def quick_check() -> Dict:
    """One-shot health check, returns metrics dict"""
    async with ObservabilitySkill() as obs:
        metrics = await obs.run_cycle()
        return {"metrics": metrics, "dashboard": obs.render_dashboard(metrics)}

if __name__ == "__main__":
    # Standalone run: print dashboard
    async def main():
        async with ObservabilitySkill() as obs:
            await obs.run_cycle()
            print(obs.render_dashboard(obs.config["agents"]))
    asyncio.run(main())
