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
    this.disabled = false;
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

const elementIds = [
  'searchInput',
  'documentList',
  'deployBtn',
  'contentPlaceholder',
  'markdownViewer',
  'docTitle',
  'docCategory',
  'markdownContent',
  'searchNavigator',
  'matchCount',
  'prevMatchBtn',
  'nextMatchBtn',
  'appContainer',
  'backBtn',
  'editBtn',
  'saveBtn',
  'cancelBtn',
  'editorContainer',
  'toastEditor',
];

const elements = Object.fromEntries(elementIds.map(id => [id, new MockElement(id)]));
const tabButtons = ['전체', '규정', '지침', '업무정리'].map(tab => {
  const button = new MockElement();
  button.dataset.tab = tab;
  return button;
});
const createdItems = [];
const fetchCalls = [];
const alerts = [];

elements.documentList.appendChild = child => {
  elements.documentList.children.push(child);
  if (child.className && child.className.includes('doc-item')) {
    createdItems.push(child);
  }
  return child;
};

const context = {
  assert,
  console,
  setTimeout: callback => callback(),
  window: {
    location: {
      search: '',
    },
  },
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
      content: '원본 내용',
    },
  ],
  marked: {
    parse: markdown => `<p>${markdown}</p>`,
  },
  toastui: {
    Editor: function Editor() {
      return {
        getMarkdown: () => '수정된 내용',
        setMarkdown: () => {},
      };
    },
  },
  fetch: async url => {
    fetchCalls.push(url);
    return {
      ok: true,
      json: async () => ({ message: '웹 반영 완료' }),
    };
  },
  alert: message => alerts.push(message),
  confirm: () => true,
};

context.toastui.Editor.plugin = { colorSyntax: {} };

const appPath = path.join(__dirname, '..', 'app.js');
const source = fs.readFileSync(appPath, 'utf8');
vm.runInNewContext(source, context, { filename: appPath });

assert.strictEqual(createdItems.length, 1, '문서 목록이 렌더링되어야 합니다.');
createdItems[0].click();
elements.editBtn.click();

Promise.resolve(elements.saveBtn.click()).then(() => {
  assert.deepStrictEqual(
    fetchCalls,
    ['/api/save', '/api/deploy'],
    '저장 성공 후 웹 반영 API가 자동으로 호출되어야 합니다.'
  );
  assert(
    alerts.some(message => message.includes('웹')),
    '자동 웹 반영 결과를 사용자에게 알려야 합니다.'
  );
}).catch(error => {
  console.error(error);
  process.exit(1);
});
