// CI smoke variant of the dashboard load test. Lower stress, shorter
// duration, but the same SLO assertions — proves the dashboard path
// stays under budget even after a deploy.
//
// Full run: `tests/load/k6/dashboard.js` (50 VU @ 1min).

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:8080';
const SESSION_COOKIE = __ENV.SESSION_COOKIE || '';

if (!SESSION_COOKIE) {
  throw new Error('SESSION_COOKIE env var is required');
}

export const options = {
  vus: 3,
  duration: '20s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

const headers = {
  cookie: `bidready_session=${SESSION_COOKIE}`,
  accept: 'application/json',
};

export default function () {
  const html = http.get(`${BASE_URL}/`, {
    headers: { cookie: `bidready_session=${SESSION_COOKIE}` },
  });
  check(html, { 'GET / 200': (r) => r.status === 200 });

  const tenders = http.get(`${API_URL}/tenders`, { headers });
  check(tenders, { 'GET /tenders 200': (r) => r.status === 200 });

  const expiring = http.get(`${API_URL}/documents/expiring`, { headers });
  check(expiring, { 'GET /documents/expiring 200': (r) => r.status === 200 });

  sleep(1);
}
