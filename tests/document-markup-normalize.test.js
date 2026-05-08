const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class MockElement {
  constructor(id = '') {
    this.id = id;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.innerHTML = '';
    this.textContent = '';
    this.listeners = {};
    this.className = '';
    this.classList = {
      add: () => {},
      remove: () => {},
    };
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(event, callback) {
    this.listeners[event] = callback;
  }

  click() {
    return this.listeners.click({ target: this });
  }

  querySelectorAll() {
    return [];
  }

  scrollTo() {}
}

const ids = [
  'searchInput', 'documentList', 'deployBtn', 'contentPlaceholder', 'markdownViewer',
  'docTitle', 'docCategory', 'markdownContent', 'searchNavigator', 'matchCount',
  'prevMatchBtn', 'nextMatchBtn', 'appContainer', 'backBtn', 'editBtn', 'saveBtn',
  'cancelBtn', 'editorContainer', 'toastEditor', 'fontSizeSelect', 'applyFontSizeBtn',
];
const elements = Object.fromEntries(ids.map(id => [id, new MockElement(id)]));
const tabButtons = ['all', 'regulation', 'guide', 'work'].map(tab => {
  const button = new MockElement();
  button.dataset.tab = tab;
  return button;
});
const createdItems = [];

elements.documentList.appendChild = child => {
  elements.documentList.children.push(child);
  if (child.className && child.className.includes('doc-item')) {
    createdItems.push(child);
  }
  return child;
};

const sourceContent = [
  '첫 문장 1) 첫 단계 2) 둘째 단계 3) 셋째 단계',
  '중간 내용',
  '동국대학교일산병원약제팀',
  '다음 내용',
  '동국대학교 일산불교병원 약제팀',
  '- ① 이미 정상인 목록',
  '## 3) 잘못 커진 번호 제목',
  '## 가. 잘못 커진 가나다 제목',
  '## 최종 검토일 2026.04.01',
].join('\n');

const context = {
  console,
  setTimeout: callback => callback(),
  window: { location: { search: '?preview=learning' } },
  URLSearchParams,
  document: {
    addEventListener: (event, callback) => {
      if (event === 'DOMContentLoaded') callback();
    },
    getElementById: id => elements[id],
    querySelector: selector => {
      if (selector === '.main-content') return new MockElement('mainContent');
      return new MockElement(selector);
    },
    querySelectorAll: selector => {
      if (selector === '.tab-btn') return tabButtons;
      if (selector === '.doc-item') return createdItems;
      return [];
    },
    createElement: () => new MockElement(),
  },
  documentsData: [
    {
      id: 'doc-1',
      title: '테스트 문서',
      category: '업무정리',
      content: sourceContent,
    },
  ],
  marked: {
    parse: markdown => markdown,
  },
  toastui: {
    Editor: function Editor() {},
  },
};

context.toastui.Editor.plugin = { colorSyntax: {} };

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
vm.runInNewContext(source, context);

createdItems[0].click();

assert(
  !elements.markdownContent.innerHTML.includes('동국대학교일산병원약제팀'),
  '붙어 들어온 병원명 페이지 머리말은 본문에서 제거해야 합니다.'
);
assert(
  !elements.markdownContent.innerHTML.includes('동국대학교 일산불교병원 약제팀'),
  '띄어쓰기 있는 병원명 페이지 머리말도 본문에서 제거해야 합니다.'
);
assert(
  elements.markdownContent.innerHTML.includes('첫 문장\n\n1) 첫 단계\n\n2) 둘째 단계\n\n3) 셋째 단계'),
  '한 줄에 붙은 번호 단계는 각각 줄바꿈되어야 합니다.'
);
assert(
  elements.markdownContent.innerHTML.includes('- ① 이미 정상인 목록'),
  '이미 정상인 하이픈 번호 목록은 하이픈과 번호가 갈라지면 안 됩니다.'
);
assert(
  !elements.markdownContent.innerHTML.includes('## 3) 잘못 커진 번호 제목'),
  '번호 항목에 잘못 붙은 제목 마크다운은 제거해야 합니다.'
);
assert(
  !elements.markdownContent.innerHTML.includes('## 가. 잘못 커진 가나다 제목'),
  '가나다 항목에 잘못 붙은 제목 마크다운은 제거해야 합니다.'
);
assert(
  !elements.markdownContent.innerHTML.includes('## 최종 검토일 2026.04.01'),
  '검토일 문구에 잘못 붙은 제목 마크다운은 제거해야 합니다.'
);
