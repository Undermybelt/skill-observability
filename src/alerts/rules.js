// Rules Engine
// 评估告警规则，管理冷却时间

const { sendAlert } = require('./dispatcher');

/**
 * 规则上下文：提供 eval 可用的变量
 */
function buildContext(state, rule) {
  return {
    state: state,
    rule: rule,
    now: Date.now(),

    // 辅助函数
    minutesAgo: (ts) => ts ? (Date.now() - new Date(ts).getTime()) / 60000 : Infinity,
    hoursAgo: (ts) => ts ? (Date.now() - new Date(ts).getTime()) / 3600000 : Infinity,

    // agents 快捷访问
    agent: (label) => state.agents ? state.agents[label] : null,
    agents: state.agents || {},

    // crons 快捷访问
    cron: (idOrName) => state.crons ? state.crons.find(c => c.id === idOrName || c.name === idOrName) : null,
    crons: state.crons || [],

    // resources 快捷访问
    resources: state.resources || {}
  };
}

/**
 * 评估单个规则条件
 * @param {Object} rule - 规则配置
 * @param {Object} state - 当前状态快照
 * @returns {boolean}
 */
function evaluateCondition(rule, state) {
  const ctx = buildContext(state, rule);

  try {
    // 使用 Function 构造器创建条件函数
    // 安全警告：仅用于可信配置（用户本地配置）
    const conditionFn = new Function('ctx', `with (ctx) { return ${rule.condition}; }`);
    return conditionFn(ctx);
  } catch (err) {
    console.error(`Rule "${rule.id}" evaluation error:`, err.message);
    return false;
  }
}

/**
 * 检查规则是否在冷却中
 * @param {Object} rule - 规则
 * @param {Object} alertHistory - 告警历史 { ruleId: lastTriggeredTimestamp }
 * @returns {boolean}
 */
function isInCooldown(rule, alertHistory) {
  if (!rule.cooldown) return false;

  const lastTriggered = alertHistory[rule.id];
  if (!lastTriggered) return false;

  const cooldownMs = parseCooldown(rule.cooldown);
  return Date.now() - lastTriggered < cooldownMs;
}

/**
 * 解析冷却时间字符串 (如 "5m", "1h", "30s")
 */
function parseCooldown(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 0;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60000;
    case 'h': return value * 3600000;
    case 'd': return value * 86400000;
    default: return 0;
  }
}

/**
 * 评估所有规则，生成告警
 * @param {Object} state - 当前状态快照
 * @param {Array} rules - 规则列表
 * @param {Object} alertHistory - 告警历史
 * @returns {Array} 触发的告警列表
 */
async function evaluateAllRules(state, rules, alertHistory, channels) {
  const triggered = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (isInCooldown(rule, alertHistory)) continue;

    const conditionMet = evaluateCondition(rule, state);
    if (conditionMet) {
      // 生成告警对象
      const alert = {
        id: `alert_${Date.now()}_${rule.id}`,
        rule_id: rule.id,
        triggered_at: new Date().toISOString(),
        message: rule.message || `Rule "${rule.id}" triggered`,
        severity: rule.severity || 'warning',
        resolved: false
      };

      // 发送告警
      const channelConfig = channels[rule.channel];
      if (channelConfig) {
        await sendAlert(alert, channelConfig);
      } else {
        console.warn(`Channel "${rule.channel}" not configured for rule "${rule.id}"`);
      }

      triggered.push(alert);

      // 更新告警历史
      alertHistory[rule.id] = Date.now();
    }
  }

  return triggered;
}

module.exports = {
  evaluateCondition,
  isInCooldown,
  evaluateAllRules,
  buildContext,
  parseCooldown  // 导出供测试
};
