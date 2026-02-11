#!/usr/bin/env node
// Observability Skill - Main Entry Point
// 统一监控入口：合并所有监控器，评估规则，提供 CLI 接口

const fs = require('fs');
const path = require('path');

const { pollAgents } = require('./monitors/agent-health');
const { pollCrons } = require('./monitors/cron-health');
const { pollResources } = require('./monitors/resources');
const { evaluateAllRules, parseCooldown } = require('./alerts/rules');
const { showDashboard } = require('./dashboard/cli');

// 默认配置
const DEFAULT_CONFIG = {
  poll_interval: 60,
  retention_days: 30,
  channels: { discord: { enabled: true }, telegram: { enabled: false } },
  rules: [
    { id: 'session_offline_main', description: 'Main instance offline', condition: 'agent("main").status !== "online"', cooldown: '5m', severity: 'critical', channel: 'discord' },
    { id: 'high_token_usage', description: 'High token consumption (> 100k/hr)', condition: 'agent("main").token_usage_last_hour > 100000', cooldown: '1h', severity: 'warning', channel: 'telegram' },
    { id: 'cron_missed', description: 'Cron job missed', condition: 'crons.some(c => c.missed_runs > 0)', cooldown: '30m', severity: 'warning', channel: 'discord' },
    { id: 'apprentice2_offline', description: 'Apprentice2 instance offline', condition: 'agent("apprentice2") && agent("apprentice2").status !== "online"', cooldown: '5m', severity: 'critical', channel: 'discord' },
    { id: 'dev_offline', description: 'Dev instance offline', condition: 'agent("dev") && agent("dev").status !== "online"', cooldown: '5m', severity: 'warning', channel: 'discord' }
  ]
};

class ObservabilitySkill {
  constructor() {
    this.config = DEFAULT_CONFIG;
    this.state = null;
    this.alertHistory = {};
    this.stateFile = path.join(__dirname, '..', '..', 'data', 'state.json');
  }

  /**
   * 加载配置文件 (JSON 或环境变量覆盖)
   */
  async loadConfig() {
    const configPaths = [
      path.join(process.env.HOME, '.openclaw', 'observability.json'),
      path.join(__dirname, '..', '..', 'config', 'observability.json'),
      path.join(__dirname, '..', 'config', 'default.json')
    ];

    for (const p of configPaths) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf8');
          const userConfig = JSON.parse(content);
          this.config = { ...DEFAULT_CONFIG, ...userConfig };
          console.log(`[Observability] Config loaded from ${p}`);
          break;
        } catch (err) {
          console.warn(`[Observability] Failed to load config from ${p}: ${err.message}`);
        }
      }
    }
  }

  /**
   * 加载状态快照
   */
  async loadState() {
    if (fs.existsSync(this.stateFile)) {
      try {
        const content = fs.readFileSync(this.stateFile, 'utf8');
        this.state = JSON.parse(content);
        console.log('[Observability] State loaded from history');
      } catch (err) {
        console.warn('[Observability] Failed to load state, starting fresh:', err.message);
        this.state = null;
      }
    }
  }

  /**
   * 保存状态快照
   */
  async saveState() {
    if (!this.state) return;

    const dir = path.dirname(this.stateFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  /**
   * 执行一次完整轮询
   */
  async pollOnce() {
    console.log(`[Observability] Polling at ${new Date().toISOString()}`);

    const [agents, crons, resources] = await Promise.all([
      pollAgents(),
      pollCrons(),
      pollResources()
    ]);

    this.state = {
      timestamp: new Date().toISOString(),
      agents: agents.agents,
      crons: crons.crons,
      resources: resources
    };

    // 评估规则
    const alerts = await evaluateAllRules(
      this.state,
      this.config.rules,
      this.alertHistory,
      this.config.channels
    );

    // 保存状态
    await this.saveState();

    console.log(`[Observability] Poll complete. Agents: ${Object.keys(agents.agents).length}, Cron: ${crons.crons.length}, Alerts: ${alerts.length}`);
    return { state: this.state, alerts };
  }

  /**
   * 显示仪表盘 (单次快照)
   */
  async status() {
    if (!this.state) {
      await this.pollOnce();
    }

    const activeAlerts = Object.entries(this.alertHistory)
      .filter(([ruleId, ts]) => Date.now() - ts < 3600000)
      .map(([ruleId, ts]) => ({
        rule_id: ruleId,
        triggered_at: new Date(ts).toISOString(),
        message: this.config.rules.find(r => r.id === ruleId)?.description || ruleId,
        severity: this.config.rules.find(r => r.id === ruleId)?.severity || 'info'
      }));

    showDashboard(this.state, activeAlerts);
  }

  /**
   * 启动持续监控 (用于 Heartbeat)
   */
  async startMonitoring() {
    console.log('[Observability] Starting continuous monitoring (interval: ' + this.config.poll_interval + 's)');

    await this.loadConfig();
    await this.loadState();

    await this.pollOnce();

    setInterval(async () => {
      try {
        await this.pollOnce();
      } catch (err) {
        console.error('[Observability] Polling error:', err);
      }
    }, this.config.poll_interval * 1000);
  }

  /**
   * CLI 入口
   */
  async run(args) {
    await this.loadConfig();

    if (args.includes('--init')) {
      console.log('[Observability] Initializing...');
      await this.loadState();
      await this.pollOnce();
      await this.status();
      return;
    }

    if (args.includes('status') || args.includes('dashboard')) {
      await this.loadState();
      await this.status();
      return;
    }

    if (args.includes('start') || args.includes('monitor')) {
      await this.startMonitoring();
      return;
    }

    await this.loadState();
    await this.status();
  }
}

module.exports = ObservabilitySkill;

if (require.main === module) {
  const skill = new ObservabilitySkill();
  skill.run(process.argv.slice(2)).catch(console.error);
}
