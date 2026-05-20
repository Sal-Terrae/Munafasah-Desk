// PRD SLO: P95 < 2000ms at 50 VU sustained for 1 minute against the
// authenticated dashboard route + its data fetches.
//
// k6 docs: https://k6.io/docs/

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:8080';
const SESSION_COOKIE = __ENV.SESSION_COOKIE || '';

if (!SESSION_COOKIE) {
  // Bail loudly — k6 can't currently log in for itself, so the script
  // is parameterised by an externally-obtained cookie.
  throw new Error('SESSION_COOKIE env var is required (see tests/load/README.md)');
}

export const options = {
  scenarios: {
    dashboard_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '60s', target: 50 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    'http_req_duration{name:dashboard_html}': ['p(95)<2000'],
    'http_req_duration{name:tenders_list}': ['p(95)<2000'],
    'http_req_duration{name:expiring_docs}': ['p(95)<2000'],
  },
};

const headers = {
  cookie: `bidready_session=${SESSION_COOKIE}`,
  accept: 'application/json',
};

export default function () {
  // Dashboard renders an HTML page that in turn fetches the two
  // tender/document endpoints server-side. We hit all three to mimic
  // the wall-clock the user experiences.
  const html = http.get(`${BASE_URL}/`, {
    tags: { name: 'dashboard_html' },
    headers: { cookie: `bidready_session=${SESSION_COOKIE}` },
  });
  check(html, { 'GET / 200': (r) => r.status === 200 });

  const tenders = http.get(`${API_URL}/tenders`, {
    tags: { name: 'tenders_list' },
    headers,
  });
  check(tenders, { 'GET /tenders 200': (r) => r.status === 200 });

  const expiring = http.get(`${API_URL}/documents/expiring`, {
    tags: { name: 'expiring_docs' },
    headers,
  });
  check(expiring, { 'GET /documents/expiring 200': (r) => r.status === 200 });

  sleep(1);
}
