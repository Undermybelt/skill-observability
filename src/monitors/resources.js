// Resource Usage Tracker
// 监控系统资源（内存、磁盘、负载）

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * 获取系统资源使用情况
 * @returns {Promise<Object>} 资源快照
 */
async function pollResources() {
  try {
    // 内存使用 (macOS/Linux)
    const { stdout: memInfo } = await execAsync('vm_stat 2>/dev/null || free -h 2>/dev/null || echo "N/A"');

    // 磁盘使用
    const { stdout: diskInfo } = await execAsync('df -h / 2>/dev/null | tail -1');

    // 负载 (1/5/15 min)
    let loadAvg = 'N/A';
    try {
      const { stdout: loadInfo } = await execAsync('sysctl -n vm.loadavg 2>/dev/null || uptime');
      // 提取 load average (简化)
      const match = loadInfo.match(/load average:?\s+([\d.]+),\s+([\d.]+),\s+([\d.]+)/);
      if (match) {
        loadAvg = { load1: parseFloat(match[1]), load5: parseFloat(match[2]), load15: parseFloat(match[3]) };
      }
    } catch (_) {
      loadAvg = 'N/A';
    }

    // 简化：只返回关键指标
    return {
      timestamp: new Date().toISOString(),
      memory_usage_mb: extractMemoryMB(memInfo),
      disk_usage_percent: extractDiskPercent(diskInfo),
      load_average: loadAvg
    };
  } catch (err) {
    console.error('Resource Tracker error:', err);
    throw err;
  }
}

/**
 * 从 vm_stat 或 free 输出提取内存使用 (MB)
 */
function extractMemoryMB(output) {
  // 尝试匹配 macOS vm_stat
  const match = output.match(/Pages active:\s+(\d+)/);
  if (match) {
    const pages = parseInt(match[1]);
    const pageSize = 16384; // 16KB (macOS default)
    return Math.round((pages * pageSize) / (1024 * 1024));
  }

  // 尝试匹配 free -h (Total column)
  const freeMatch = output.match(/Mem:\s+\S+\s+\S+\s+\S+\s+(\d+)M/);
  if (freeMatch) {
    return parseInt(freeMatch[1]);
  }

  return null;
}

/**
 * 从 df 输出提取磁盘使用百分比
 */
function extractDiskPercent(output) {
  const match = output.match(/(\d+)%/);
  return match ? parseInt(match[1]) : null;
}

module.exports = { pollResources };
