#!/usr/bin/env node
// Alert Dispatcher (CLI-based)

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * 发送告警消息
 */
async function sendAlert(alert, channelConfig) {
  const { channel } = channelConfig;

  const severityEmoji = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const content = `${severityEmoji[alert.severity] || '📢'} **${alert.severity.toUpperCase()}**\n${alert.message}`;

  try {
    // 使用 openclaw message send
    await execAsync(`openclaw message send --channel ${channel} --message "${content.replace(/"/g, '\\"')}"`, {
      maxBuffer: 1024 * 1024
    });
    console.log(`[Alert] Sent to ${channel}: ${alert.message}`);
    return true;
  } catch (err) {
    console.error(`[Alert] Failed to send to ${channel}:`, err.message);
    return false;
  }
}

module.exports = { sendAlert };
