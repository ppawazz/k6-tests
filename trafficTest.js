import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';


const responseTime = new Trend('response_time_ms');   
const successRate = new Rate('success_rate');         
const errorRate = new Rate('error_rate');             
const requestCounter = new Counter('total_requests'); 

const loadProfile = __ENV.LOAD_PROFILE || 'low';

let testStages;
switch (loadProfile) {
  case 'low':
    testStages = [
      { duration: '15s', target: 50 },   
      { duration: '30s', target: 100 },  
      { duration: '1m', target: 100 },   
      { duration: '10s', target: 0 },    
    ];
    break;

  case 'medium':
    testStages = [
      { duration: '20s', target: 100 },  
      { duration: '40s', target: 500 },  
      { duration: '1m', target: 500 },   
      { duration: '15s', target: 0 },   
    ];
    break;

  case 'high':
    testStages = [
      { duration: '30s', target: 250 },  
      { duration: '1m', target: 1000 },  
      { duration: '1m', target: 1000 },  
      { duration: '20s', target: 0 },    
    ];
    break;
  
  default:
      console.log(`Unknown profile "${loadProfile}". Running LOW load profile.`);
      testStages = [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 0 },
      ];
}

export const options = {
  stages: testStages,
  discardResponseBodies: false, 
  thresholds: {
    'http_req_duration': ['p(95)<200'], 
    'success_rate': ['rate>=0.99'],     
    'error_rate': ['rate<0.01'],        
  },
};

export default function () {
  const targetURL = __ENV.TARGET_URL || 'http://localhost:3000/api/data';

  const res = http.get(targetURL);

  const isSuccess = check(res, {
    'Status is 200 OK': (r) => r.status === 200,
  });

  responseTime.add(res.timings.duration);
  successRate.add(isSuccess);
  errorRate.add(!isSuccess);
  requestCounter.add(1);

  sleep(1);
}

// export function handleSummary(data) {
//     console.log('Finished executing tests. Summary report:');
    
//     console.log(textSummary(data, { indent: ' ', enableColors: true }));
    
//     return {
//         'summary.json': JSON.stringify(data, null, 2), 
//     };
// }