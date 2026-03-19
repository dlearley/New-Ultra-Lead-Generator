const autocannon = require('autocannon');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-jwt-token-here';

// Test scenarios
const scenarios = {
  // Light load - baseline
  light: {
    connections: 10,
    duration: 30,
    pipelining: 1,
  },
  // Medium load - typical usage
  medium: {
    connections: 50,
    duration: 60,
    pipelining: 1,
  },
  // Heavy load - stress test
  heavy: {
    connections: 100,
    duration: 60,
    pipelining: 1,
  },
  // Extreme load - breaking point
  extreme: {
    connections: 200,
    duration: 30,
    pipelining: 1,
  },
};

// Test endpoints
const endpoints = [
  {
    name: 'Health Check',
    path: '/health',
    method: 'GET',
    auth: false,
  },
  {
    name: 'List Contacts',
    path: '/contacts?page=1&limit=20',
    method: 'GET',
    auth: true,
  },
  {
    name: 'Get Contact',
    path: '/contacts/contact_123',
    method: 'GET',
    auth: true,
  },
  {
    name: 'Create Contact',
    path: '/contacts',
    method: 'POST',
    auth: true,
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'User',
      email: `test${Date.now()}@example.com`,
      source: 'load-test',
    }),
  },
  {
    name: 'Dashboard Summary',
    path: '/analytics-dashboard/summary',
    method: 'GET',
    auth: true,
  },
  {
    name: 'Rate Limit Status',
    path: '/rate-limit/status',
    method: 'GET',
    auth: true,
  },
];

async function runTest(endpoint, scenarioName) {
  const scenario = scenarios[scenarioName];
  
  console.log(`\n🧪 Testing: ${endpoint.name} (${scenarioName} load)`);
  console.log(`   Endpoint: ${endpoint.method} ${endpoint.path}`);
  console.log(`   Connections: ${scenario.connections}, Duration: ${scenario.duration}s`);

  const headers = {
    'Content-Type': 'application/json',
  };

  if (endpoint.auth) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  const options = {
    url: `${API_URL}${endpoint.path}`,
    connections: scenario.connections,
    duration: scenario.duration,
    pipelining: scenario.pipelining,
    method: endpoint.method,
    headers,
    body: endpoint.body,
  };

  const result = await autocannon(options);

  // Print results
  console.log(`\n📊 Results:`);
  console.log(`   Requests/sec: ${result.requests.average.toFixed(2)}`);
  console.log(`   Latency (avg): ${result.latency.average.toFixed(2)} ms`);
  console.log(`   Latency (p99): ${result.latency.p99.toFixed(2)} ms`);
  console.log(`   Total Requests: ${result.requests.sent}`);
  console.log(`   Errors: ${result.errors}`);
  console.log(`   Timeouts: ${result.timeouts}`);
  console.log(`   2xx: ${result['2xx']}, 4xx: ${result['4xx']}, 5xx: ${result['5xx']}`);

  return result;
}

async function runFullSuite() {
  console.log('🚀 Ultra Lead Generator - Load Testing Suite');
  console.log(`   Target: ${API_URL}`);
  console.log(`   Time: ${new Date().toISOString()}`);
  console.log('');

  const results = [];

  // Test health endpoint (no auth required)
  console.log('\n========================================');
  console.log('Health Check Tests (Public Endpoint)');
  console.log('========================================');
  
  for (const [scenarioName] of Object.entries(scenarios)) {
    const result = await runTest(endpoints[0], scenarioName);
    results.push({ endpoint: 'Health', scenario: scenarioName, ...result });
  }

  // Test authenticated endpoints with medium load
  console.log('\n========================================');
  console.log('Authenticated Endpoint Tests (Medium Load)');
  console.log('========================================');

  for (const endpoint of endpoints.slice(1)) {
    const result = await runTest(endpoint, 'medium');
    results.push({ endpoint: endpoint.name, scenario: 'medium', ...result });
  }

  // Summary
  console.log('\n========================================');
  console.log('📈 TEST SUMMARY');
  console.log('========================================');
  
  const summary = results.map(r => ({
    endpoint: r.endpoint,
    scenario: r.scenario,
    rps: r.requests.average.toFixed(2),
    latencyAvg: `${r.latency.average.toFixed(2)}ms`,
    latencyP99: `${r.latency.p99.toFixed(2)}ms`,
    errors: r.errors,
    status: r.errors === 0 && r['5xx'] === 0 ? '✅ PASS' : '❌ FAIL',
  }));

  console.table(summary);

  // Performance report
  const avgRPS = results.reduce((sum, r) => sum + r.requests.average, 0) / results.length;
  const avgLatency = results.reduce((sum, r) => sum + r.latency.average, 0) / results.length;
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  const total5xx = results.reduce((sum, r) => sum + r['5xx'], 0);

  console.log('\n📊 Overall Performance:');
  console.log(`   Average RPS: ${avgRPS.toFixed(2)}`);
  console.log(`   Average Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`   Total Errors: ${totalErrors}`);
  console.log(`   5xx Errors: ${total5xx}`);

  if (totalErrors === 0 && total5xx === 0) {
    console.log('\n✅ ALL TESTS PASSED - System is performing well!');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - Review errors above');
  }

  return results;
}

// Run if called directly
if (require.main === module) {
  runFullSuite().catch(console.error);
}

module.exports = { runTest, runFullSuite };
