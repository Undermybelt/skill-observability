#!/usr/bin/env node
// Cron Health Checker (CLI-based)

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function runOpenClawCommand(cmd) {
  try {
    const { stdout } = await execAsync(`openclaw ${cmd} --json`, { maxBuffer: 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (err) {
    try {
      const { stdout } = await execAsync(`openclaw ${cmd}`, { maxBuffer: 1024 * 1024 });
      try { return JSON.parse(stdout); } catch (_) { return { raw: stdout }; }
    } catch (err2) {
      throw new Error(`Command failed: openclaw ${cmd}: ${err2.message}`);
    }
  }
}

/**
 * 获取所有 cron 任务状态
 */
async function pollCrons() {
  try {
    const cronList = await runOpenClawCommand('cron list');

    const jobs = Array.isArray(cronList) ? cronList : (cronList.jobs || cronList.crons || []);

    const crons = [];
    const now = Date.now();

    for (const job of jobs) {
      const schedule = job.schedule || {};
      const lastRun = job.lastRun ? new Date(job.lastRun).getTime() : null;
      const nextRun = job.nextRun ? new Date(job.nextRun).getTime() : null;

      let missedRuns = 0;
      if (lastRun && schedule.kind === 'every') {
        const interval = schedule.everyMs;
        const expectedRuns = Math.floor((now - lastRun) / interval);
        const actualRuns = job.runCount || 1;
        missedRuns = Math.max(0, expectedRuns - actualRuns);
      }

      crons.push({
        id: job.id || job.jobId,
        name: job.name || job.id,
        schedule: schedule,
        next_run: nextRun ? new Date(nextRun).toISOString() : null,
        last_run: lastRun ? new Date(lastRun).toISOString() : null,
        last_status: job.lastStatus || 'unknown',
        missed_runs: missedRuns,
        run_count: job.runCount || 0,
        enabled: job.enabled !== false
      });
    }

    return { timestamp: new Date().toISOString(), crons };
  } catch (err) {
    console.error('pollCrons error:', err);
    return { timestamp: new Date().toISOString(), crons: [] };
  }
}

module.exports = { pollCrons };
