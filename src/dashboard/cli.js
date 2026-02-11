// CLI Dashboard
// 控制台状态展示 (类似 top/htop)

// 简易 Table 实现 (无外部依赖)
function Table(rows, options = {}) {
  if (!rows.length) return '';

  const colCount = rows[0].length;
  const colWidths = new Array(colCount).fill(0);

  // 计算每列最大宽度
  for (const row of rows) {
    for (let i = 0; i < colCount; i++) {
      const cell = String(row[i] || '').replace(/\u001b\[[0-9;]*m/g, '');
      colWidths[i] = Math.max(colWidths[i], cell.length);
    }
  }

  // 生成行
  const lines = [];
  const headerSeparator = `├${colWidths.map(w => '─'.repeat(w)).join('┼')}┤`;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = row.map((cell, idx) => {
      const cellStr = String(cell || '');
      const padded = cellStr.padEnd(colWidths[idx]);
      return idx === 0 ? `│ ${padded} ` : ` ${padded} `;
    }).join('│') + '│';
    lines.push(line);

    if (i === 0 && options.headerLine !== false) {
      lines.push(headerSeparator);
    }
  }

  return lines.join('\n');
}

/**
 * 渲染整体仪表盘
 */
function showDashboard(state, activeAlerts = []) {
  console.clear();
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         OpenClaw Observability Dashboard                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Agent 状态
  console.log('🧠 Agents:');
  console.log(renderAgentTable(state.agents));
  console.log();

  // Cron 状态
  if (state.crons && state.crons.length > 0) {
    console.log('⏰ Cron Jobs:');
    console.log(renderCronTable(state.crons));
    console.log();
  }

  // 资源
  if (state.resources) {
    console.log('💾 Resources:');
    console.log(renderResourcesTable(state.resources));
    console.log();
  }

  // 告警
  console.log(`🚨 Active Alerts: ${activeAlerts.length}`);
  if (activeAlerts.length > 0) {
    console.log(renderAlertTable(activeAlerts));
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
}

/**
 * 渲染 Agent 状态表格
 */
function renderAgentTable(agents) {
  if (!agents || Object.keys(agents).length === 0) {
    return '  (no agents found)';
  }

  const rows = [['Name', 'Status', 'Last Seen', 'Model', 'Tokens/hr']];

  for (const [name, agent] of Object.entries(agents)) {
    const statusIcon = agent.status === 'online' ? '🟢' : agent.status === 'offline' ? '🔴' : '⚪';
    const lastSeen = agent.last_seen ? formatRelativeTime(agent.last_seen) : 'never';
    const tokens = agent.token_usage_last_hour ? Math.round(agent.token_usage_last_hour).toLocaleString() : '-';

    rows.push([name, `${statusIcon} ${agent.status}`, lastSeen, agent.model || '-', tokens]);
  }

  return Table(rows);
}

/**
 * 渲染 Cron 状态表格
 */
function renderCronTable(crons) {
  if (!crons || crons.length === 0) {
    return '  (no cron jobs)';
  }

  const rows = [['Name', 'Next Run', 'Last Run', 'Status', 'Missed']];

  for (const cron of crons) {
    const nextRun = cron.next_run ? formatTime(cron.next_run) : 'N/A';
    const lastRun = cron.last_run ? formatRelativeTime(cron.last_run) : 'never';
    const status = cron.enabled ? (cron.last_status === 'success' ? '✅' : '❓') : '⏸️';
    const missed = cron.missed_runs > 0 ? `🔴 ${cron.missed_runs}` : '0';

    rows.push([cron.name || cron.id, nextRun, lastRun, status, missed]);
  }

  return Table(rows);
}

/**
 * 渲染资源表格
 */
function renderResourcesTable(resources) {
  const rows = [];
  if (resources.memory_usage_mb) rows.push(['Memory', `${resources.memory_usage_mb} MB`]);
  if (resources.disk_usage_percent) rows.push(['Disk', `${resources.disk_usage_percent}%`]);
  if (resources.load_average && resources.load_average !== 'N/A') {
    const { load1, load5, load15 } = resources.load_average;
    rows.push(['Load Avg', `1m:${load1.toFixed(2)} 5m:${load5.toFixed(2)} 15m:${load15.toFixed(2)}`]);
  }

  return Table(rows);
}

/**
 * 渲染告警表格
 */
function renderAlertTable(alerts) {
  const rows = [['Time', 'Severity', 'Message']];

  for (const alert of alerts.slice(0, 10)) {
    rows.push([
      formatTime(alert.triggered_at),
      alert.severity.toUpperCase(),
      alert.message.substring(0, 50) + (alert.message.length > 50 ? '...' : '')
    ]);
  }

  return Table(rows);
}

/**
 * 格式化时间
 */
function formatTime(isoString) {
  if (!isoString) return 'N/A';
  const d = new Date(isoString);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/**
 * 相对时间
 */
function formatRelativeTime(isoString) {
  if (!isoString) return 'unknown';
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return Math.floor(diffHr / 24) + 'd ago';
}

module.exports = { showDashboard };
