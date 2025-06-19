import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Mendefinisikan metrik kustom untuk dicatat selama pengujian.
export const responseTime = new Trend('response_time_ms');
export const successRate = new Rate('success_rate');
export const errorRate = new Rate('error_rate');
export const requestCounter = new Counter('total_requests');

// Mengambil profil beban (low, medium, high) dari perintah yang dijalankan.
const loadProfile = __ENV.LOAD_PROFILE || 'low';

// Definisi tahapan beban untuk setiap profil.
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

// Opsi utama untuk pengujian K6.
export const options = {
  stages: stages[loadProfile] || stages.low,
  thresholds: {
    'http_req_duration': ['p(95)<200'],
    'success_rate': ['rate>=0.99'],
    'error_rate': ['rate<0.01'],
  },
};

// Fungsi utama yang akan dijalankan oleh setiap Virtual User (VU).
export default function () {
  const res = http.get(__ENV.TARGET_URL);

  const isSuccess = check(res, { 'Status is 200 OK': (r) => r.status === 200 });

  responseTime.add(res.timings.duration);
  successRate.add(isSuccess);
  errorRate.add(!isSuccess);
  requestCounter.add(1);

  sleep(1);
}