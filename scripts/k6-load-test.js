import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const successCounter = new Counter('successful_requests');

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Test options
export const options = {
  stages: [
    // Ramp up
    { duration: '30s', target: 50 },
    // Steady state
    { duration: '2m', target: 50 },
    // Ramp up more
    { duration: '30s', target: 100 },
    // Peak load
    { duration: '2m', target: 100 },
    // Ramp down
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
    errors: ['rate<0.05'],            // Less than 5% custom errors
  },
};

// Headers
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};

export default function () {
  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/health`);
    
    const checkResult = check(response, {
      'health status is 200': (r) => r.status === 200,
      'health response time < 100ms': (r) => r.timings.duration < 100,
    });

    errorRate.add(!checkResult);
    requestDuration.add(response.timings.duration);
    
    if (checkResult) successCounter.add(1);
  });

  sleep(1);

  group('Contacts API', () => {
    // List contacts
    const listResponse = http.get(`${BASE_URL}/contacts?page=1&limit=20`, { headers });
    
    check(listResponse, {
      'list contacts status is 200': (r) => r.status === 200,
      'list contacts time < 300ms': (r) => r.timings.duration < 300,
    });

    errorRate.add(listResponse.status !== 200);
    requestDuration.add(listResponse.timings.duration);

    sleep(1);

    // Create contact
    const createPayload = JSON.stringify({
      firstName: `Test${Math.random().toString(36).substr(2, 5)}`,
      lastName: 'User',
      email: `test${Date.now()}${Math.random().toString(36).substr(2, 5)}@example.com`,
      source: 'load-test',
    });

    const createResponse = http.post(`${BASE_URL}/contacts`, createPayload, { headers });
    
    check(createResponse, {
      'create contact status is 201': (r) => r.status === 201,
      'create contact time < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(createResponse.status !== 201);
    requestDuration.add(createResponse.timings.duration);
  });

  sleep(2);

  group('Analytics Dashboard', () => {
    const response = http.get(`${BASE_URL}/analytics-dashboard/summary`, { headers });
    
    check(response, {
      'analytics status is 200': (r) => r.status === 200,
      'analytics time < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(response.status !== 200);
    requestDuration.add(response.timings.duration);
  });

  sleep(1);

  group('Rate Limit Status', () => {
    const response = http.get(`${BASE_URL}/rate-limit/status`, { headers });
    
    check(response, {
      'rate limit status is 200': (r) => r.status === 200,
    });

    errorRate.add(response.status !== 200);
    requestDuration.add(response.timings.duration);
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: `
========================================
📊 LOAD TEST RESULTS
========================================
Duration: ${data.state.testRunDurationMs / 1000}s
Virtual Users: ${data.metrics.vus_max ? data.metrics.vus_max.max : 'N/A'}

📈 Request Metrics:
  Total Requests: ${data.metrics.http_reqs ? data.metrics.http_reqs.count : 0}
  Requests/sec: ${data.metrics.http_reqs ? (data.metrics.http_reqs.count / (data.state.testRunDurationMs / 1000)).toFixed(2) : 0}
  
⏱️  Latency:
  Average: ${data.metrics.http_req_duration ? data.metrics.http_req_duration.avg.toFixed(2) : 0}ms
  P50: ${data.metrics.http_req_duration ? data.metrics.http_req_duration.med.toFixed(2) : 0}ms
  P95: ${data.metrics.http_req_duration ? data.metrics.http_req_duration['p(95)'].toFixed(2) : 0}ms
  P99: ${data.metrics.http_req_duration ? data.metrics.http_req_duration['p(99)'].toFixed(2) : 0}ms

✅ Success Rate:
  Passed: ${data.metrics.checks ? data.metrics.checks.passes : 0}
  Failed: ${data.metrics.checks ? data.metrics.checks.fails : 0}
  
❌ Errors:
  HTTP Errors: ${data.metrics.http_req_failed ? (data.metrics.http_req_failed.rate * 100).toFixed(2) : 0}%
  Custom Errors: ${data.metrics.errors ? (data.metrics.errors.rate * 100).toFixed(2) : 0}%

${data.metrics.http_req_failed && data.metrics.http_req_failed.rate < 0.01 && data.metrics.http_req_duration && data.metrics.http_req_duration['p(95)'] < 500 
  ? '✅ ALL THRESHOLDS PASSED' 
  : '⚠️  SOME THRESHOLDS FAILED'}
`,
  };
}
