import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    low_traffic: {
      executor: 'constant-arrival-rate',
      rate: 1000, // 1000 RPS
      duration: '1m',
      preAllocatedVUs: 100,
      maxVUs: 500,
    },
    medium_traffic: {
      executor: 'constant-arrival-rate',
      startTime: '1m',
      rate: 10000, // 10.000 RPS
      duration: '1m',
      preAllocatedVUs: 500,
      maxVUs: 2000,
    },
    high_traffic: {
      executor: 'constant-arrival-rate',
      startTime: '2m',
      rate: 1000000, // 1.000.000 RPS
      duration: '1m',
      preAllocatedVUs: 5000,
      maxVUs: 10000,
    },
  },
};

export default function () {
  const res = http.get('http://AWS/api/data'); 
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
