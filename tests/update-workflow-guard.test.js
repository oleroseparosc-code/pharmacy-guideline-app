const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const autoSync = fs.readFileSync(path.join(root, 'auto_sync.py'), 'utf8');
const manualBat = fs.readFileSync(path.join(root, '수동업데이트_실행기.bat'), 'utf8');
const guide = fs.readFileSync(path.join(root, '수동업데이트_절차.md'), 'utf8');

assert(
  autoSync.includes('build_dist.py'),
  '데이터/PDF 자동 업데이트는 dist 생성을 포함해야 합니다.'
);
assert(
  autoSync.includes('"data.js"') && autoSync.includes('"dist/data.js"'),
  '자동 업데이트는 data.js와 dist/data.js를 Git에 포함해야 합니다.'
);
assert(
  autoSync.includes('"custom_edits.json"'),
  '자동 업데이트는 편집기 수동 저장 보존 파일 custom_edits.json을 함께 반영해야 합니다.'
);
assert(
  manualBat.includes('python build_dist.py'),
  '수동 업데이트 실행기는 dist 생성을 먼저 수행해야 합니다.'
);
assert(
  manualBat.includes('git push origin main'),
  '수동 업데이트 실행기는 main 브랜치로 push해야 합니다.'
);
assert(
  guide.includes('편집기에서 저장') && guide.includes('수동업데이트_실행기.bat'),
  '수동 업데이트 절차 문서는 편집기 저장 후 실행기 사용법을 설명해야 합니다.'
);
