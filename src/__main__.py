#!/usr/bin/env python3
"""
Observability Skill - OpenClaw Integration Entry Point
Exposes MCP tools and CLI commands.
"""

import asyncio
import sys
from pathlib import Path
from observability import ObservabilitySkill, quick_check

def cmd_check():
    """CLI: run one health check cycle and print dashboard"""
    async def run():
        async with ObservabilitySkill() as obs:
            await obs.run_cycle()
            print(obs.render_dashboard(obs.config["agents"]))
    asyncio.run(run())

def cmd_dashboard():
    """CLI: interactive dashboard (simplified)"""
    # For now, just run check repeatedly
    print("Starting dashboard (Ctrl-C to stop)...")
    try:
        while True:
            asyncio.run(cmd_check())
            time.sleep(5)
    except KeyboardInterrupt:
        print("\nStopped.")

def cmd_alert_test(channel: str, message: str = "Test alert from observability-skill"):
    """CLI: send test alert"""
    async def run():
        async with ObservabilitySkill() as obs:
            await obs.dispatch_alert({
                "rule": "manual-test",
                "agent": "all",
                "severity": "info",
                "message": message
            })
            print(f"Test alert sent to {channel}")
    asyncio.run(run())

# OpenClaw MCP tool handlers
async def mcp_check(params: dict) -> dict:
    """MCP tool: run health check"""
    return await quick_check()

async def mcp_dashboard(params: dict) -> str:
    """MCP tool: render dashboard text"""
    async with ObservabilitySkill() as obs:
        await obs.run_cycle()
        return obs.render_dashboard(obs.config["agents"])

async def mcp_alert_test(params: dict) -> dict:
    """MCP tool: send test alert"""
    channel = params.get("channel", "discord")
    message = params.get("message", "Test alert")
    async with ObservabilitySkill() as obs:
        await obs.dispatch_alert({
            "rule": "manual",
            "agent": "all",
            "severity": "info",
            "message": message
        })
        return {"status": "sent", "channel": channel, "message": message}

# Register MCP tools
MCP_TOOLS = [
    {
        "name": "observability.check",
        "description": "Run health check on all agents",
        "handler": mcp_check
    },
    {
        "name": "observability.dashboard",
        "description": "Render observability dashboard",
        "handler": mcp_dashboard
    },
    {
        "name": "observability.alert_test",
        "description": "Send test alert to configured channels",
        "inputSchema": {
            "type": "object",
            "properties": {
                "channel": {"type": "string", "enum": ["discord", "telegram", "email"], "default": "discord"},
                "message": {"type": "string"}
            }
        },
        "handler": mcp_alert_test
    }
]

if __name__ == "__main__":
    # CLI mode: python -m osint-skill check|dashboard|alert-test
    import time
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "check":
            cmd_check()
        elif cmd == "dashboard":
            cmd_dashboard()
        elif cmd == "alert-test":
            channel = sys.argv[2] if len(sys.argv) > 2 else "discord"
            msg = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else "Test alert"
            asyncio.run(cmd_alert_test(channel, msg))
        else:
            print("Commands: check, dashboard, alert-test <channel> <message>")
    else:
        print("Observability Skill - use within OpenClaw or run commands: check, dashboard, alert-test")
