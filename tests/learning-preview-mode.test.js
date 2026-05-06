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

const elements = Object.fromEntries(ids.map(id => [id, new MockElement(id)]));
const tabButtons = ['전체', '규정', '지침', '업무정리'].map(tab => {
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

const context = {
  console,
  setTimeout: callback => callback(),
  window: {
    location: {
      search: '?preview=learning',
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
      content: '수정 내용 반영 확인',
    },
  ],
  marked: {
    parse: markdown => `<p>${markdown}</p>`,
  },
  toastui: {
    Editor: function Editor() {},
  },
};

context.toastui.Editor.plugin = { colorSyntax: {} };

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
vm.runInNewContext(source, context);

assert.strictEqual(elements.deployBtn.style.display, 'none', '학습용 미리보기에서는 웹 반영 버튼을 숨겨야 합니다.');
assert.strictEqual(createdItems.length, 1, '문서 목록이 보여야 합니다.');

createdItems[0].click();

assert.strictEqual(elements.editBtn.style.display, 'none', '학습용 미리보기에서는 문서 편집 버튼을 숨겨야 합니다.');
assert(elements.markdownContent.innerHTML.includes('수정 내용 반영 확인'), '수정된 문서 내용은 미리보기에서 보여야 합니다.');
