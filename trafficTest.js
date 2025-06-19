import http from 'k6/http';
import { textSummary } from "k6/x/reporters";
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export const responseTime = new Trend('response_time_ms');
export const successRate = new Rate('success_rate');
export const errorRate = new Rate('error_rate');
export const requestCounter = new Counter('total_requests');

const loadProfile = __ENV.LOAD_PROFILE || 'low';
const stages = {
  low: [
    { duration: '15s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '10s', target: 0 },
  ],
  medium: [
    { duration: '20s', target: 100 },
    { duration: '40s', target: 500 },
    { duration: '1m', target: 500 },
    { duration: '15s', target: 0 },
  ],
  high: [
    { duration: '30s', target: 250 },
    { duration: '1m', target: 1000 },
    { duration: '1m', target: 1000 },
    { duration: '20s', target: 0 },
  ],
};

export const options = {
  stages: stages[loadProfile] || stages.low, 
  thresholds: {
    'http_req_duration': ['p(95)<200'],
    'success_rate': ['rate>=0.99'],
    'error_rate': ['rate<0.01'],
  },
};

export default function () {
  const targetURL = __ENV.TARGET_URL;
  const res = http.get(targetURL);
  const isSuccess = check(res, { 'Status is 200 OK': (r) => r.status === 200 });

  responseTime.add(res.timings.duration);
  successRate.add(isSuccess);
  errorRate.add(!isSuccess);
  requestCounter.add(1);

  sleep(1);
}

export function handleSummary(data) {
  console.log('Test Summary:');
  console.log(textSummary(data, { indent: ' ', enableColors: true }));

  const profile = __ENV.LOAD_PROFILE || 'unknown';
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `report-${profile.toUpperCase()}-${timestamp}.html`;

  return {
    [filename]: htmlReport(data),
  };
}