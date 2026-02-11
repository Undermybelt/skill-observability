#!/usr/bin/env node
// Agent Health Monitor (CLI-based)
// 使用 openclaw CLI 命令获取状态

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * 运行 openclaw CLI 命令
 */
async function runOpenClawCommand(cmd) {
  try {
    const { stdout } = await execAsync(`openclaw ${cmd} --json`, { maxBuffer: 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (err) {
    // 如果 --json 不支持，尝试普通输出
    try {
      const { stdout } = await execAsync(`openclaw ${cmd}`, { maxBuffer: 1024 * 1024 });
      // 尝试解析（如果不是 JSON，返回原始文本）
      try { return JSON.parse(stdout); } catch (_) { return { raw: stdout }; }
    } catch (err2) {
      throw new Error(`Command failed: openclaw ${cmd}: ${err2.message}`);
    }
  }
}

/**
 * 获取所有 agent 状态
 */
async function pollAgents() {
  try {
    const sessions = await runOpenClawCommand('sessions list');

    // 处理不同格式
    const sessionList = Array.isArray(sessions) ? sessions : (sessions.sessions || []);

    const agents = {};
    for (const session of sessionList) {
      const key = session.key || session.id || session.name || 'unknown';
      const label = session.label || key;

      // 获取详细状态
      try {
        const status = await runOpenClawCommand(`session status ${key}`);
        agents[label] = {
          status: session.active ? 'online' : 'offline',
          last_seen: new Date().toISOString(),
          model: session.model || 'unknown',
          token_usage_last_hour: status.usage?.tokens || 0,
          session_key: key
        };
      } catch (_) {
        agents[label] = {
          status: session.active ? 'online' : 'unknown',
          model: session.model || 'unknown',
          token_usage_last_hour: 0
        };
      }
    }

    return { timestamp: new Date().toISOString(), agents };
  } catch (err) {
    console.error('pollAgents error:', err);
    return { timestamp: new Date().toISOString(), agents: {} };
  }
}

module.exports = { pollAgents };
