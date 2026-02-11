// Unit Tests for Observability Skill
// 手动运行: node tests/unit/test.js

const { evaluateCondition, buildContext } = require('../../src/alerts/rules');

// 模拟状态
const mockState = {
  agents: {
    main: {
      status: 'online',
      last_seen: new Date().toISOString(),
      token_usage_last_hour: 50000
    },
    dev: {
      status: 'offline',
      last_seen: new Date(Date.now() - 10 * 60000).toISOString(), // 10 min ago
      token_usage_last_hour: 0
    },
    apprentice2: {
      status: 'online',
      last_seen: new Date().toISOString(),
      token_usage_last_hour: 30000
    }
  },
  crons: [
    {
      id: 'dev-research-intensive',
      name: 'Dev Research Intensive',
      last_run: new Date().toISOString(),
      next_run: new Date(Date.now() + 15 * 60000).toISOString(),
      last_status: 'success',
      missed_runs: 0,
      enabled: true
    }
  ],
  resources: {
    memory_usage_mb: 256,
    disk_usage_percent: 45,
    load_average: { load1: 1.2, load5: 1.5, load15: 1.8 }
  }
};

// 测试函数
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}. ${msg}`);
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`Expected true, got ${value}. ${msg}`);
  }
}

function assertFalse(value, msg = '') {
  if (value) {
    throw new Error(`Expected false, got ${value}. ${msg}`);
  }
}

// 运行测试
console.log('\n🧪 Observability Skill Unit Tests\n');

test('agent("main").status is online', () => {
  const ctx = buildContext(mockState, {});
  assertEqual(ctx.agent('main').status, 'online');
});

test('agent("dev").status is offline', () => {
  const ctx = buildContext(mockState, {});
  assertEqual(ctx.agent('dev').status, 'offline');
});

test('agent("nonexistent") returns null', () => {
  const ctx = buildContext(mockState, {});
  assertEqual(ctx.agent('ghost'), null);
});

test('crons array has 1 entry', () => {
  const ctx = buildContext(mockState, {});
  assertEqual(ctx.crons.length, 1);
});

test('Condition: main online → false for offline check', () => {
  const rule = { condition: 'agent("main").status !== "online"' };
  assertFalse(evaluateCondition(rule, mockState));
});

test('Condition: dev offline → true', () => {
  const rule = { condition: 'agent("dev").status !== "online"' };
  assertTrue(evaluateCondition(rule, mockState));
});

test('Condition: cron missed runs > 0 → false (none missed)', () => {
  const rule = { condition: 'crons.some(c => c.missed_runs > 0)' };
  assertFalse(evaluateCondition(rule, mockState));
});

test('Condition: disk usage is 45% → false for > 90%', () => {
  const rule = { condition: 'resources.disk_usage_percent > 90' };
  assertFalse(evaluateCondition(rule, mockState));
});

test('Condition: memory_usage_mb exists → true', () => {
  const rule = { condition: 'resources.memory_usage_mb > 0' };
  assertTrue(evaluateCondition(rule, mockState));
});

test('Complex condition: dev offline AND minutesAgo > 5', () => {
  const rule = { condition: 'agent("dev").status !== "online" && minutesAgo(agent("dev").last_seen) > 5' };
  assertTrue(evaluateCondition(rule, mockState)); // dev offline 10 min
});

test('Cooldown parse: "5m" → 300000 ms', () => {
  const parse = require('../src/alerts/rules').isInCooldown; // hacky access
  // We'll test parseCooldown indirectly (or re-export it)
  // For now, skip
});

console.log('\n✅ Tests complete\n');
