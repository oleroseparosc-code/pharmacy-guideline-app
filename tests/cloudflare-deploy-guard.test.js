const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.py'), 'utf8');
const agents = fs.readFileSync(path.join(root, 'AGENTS.MD'), 'utf8');

assert(
  server.includes('PUBLIC_APP_URL'),
  '서버 배포 검증은 운영 app.js도 확인해야 합니다.'
);
assert(
  server.includes('wait_for_public_app_sync'),
  '서버는 data.js뿐 아니라 운영 앱 코드 반영도 기다려야 합니다.'
);
assert(
  server.includes('normalizeFontMarkup'),
  '운영 app.js 반영 확인은 이번 편집기 수정 코드까지 확인해야 합니다.'
);
assert(
  server.includes("PRODUCTION_BRANCH = \"main\""),
  '자동 배포는 Cloudflare production branch인 main 한 곳만 대상으로 해야 합니다.'
);
assert(
  !server.includes("HEAD:cloudflare/workers-autoconfig"),
  'preview/non-production 버전을 만들 수 있는 cloudflare/workers-autoconfig push는 저장 배포 흐름에서 제거해야 합니다.'
);
assert(
  agents.includes('npx wrangler deploy'),
  'Cloudflare production deploy command는 실제 활성 배포를 위해 npx wrangler deploy로 기록되어야 합니다.'
);
assert(
  !agents.includes('Deploy command: `npx wrangler versions upload`'),
  'versions upload를 production deploy command로 안내하면 실제 Workers URL이 갱신되지 않습니다.'
);
