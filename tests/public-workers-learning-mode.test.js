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
  'fontSizeSelect',
  'applyFontSizeBtn',
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
      hostname: 'pharmacy-guideline-app.olerose-parosc.workers.dev',
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
      title: '[4-1]의약품관리규정',
      category: '규정',
      content: '운영 링크에서 보여야 하는 문서',
    },
  ],
  marked: {
    parse: markdown => `<p>${markdown}</p>`,
  },
  toastui: {
    Editor: function Editor() {
      throw new Error('운영 링크에서는 편집기가 생성되면 안 됩니다.');
    },
  },
};

context.toastui.Editor.plugin = { colorSyntax: {} };

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
vm.runInNewContext(source, context);

assert.strictEqual(elements.deployBtn.style.display, 'none', '운영 링크에서는 웹 반영 버튼을 숨겨야 합니다.');
assert.strictEqual(createdItems.length, 1, '운영 링크에서도 문서 목록이 보여야 합니다.');

createdItems[0].click();

assert.strictEqual(elements.editBtn.style.display, 'none', '운영 링크에서는 문서 편집 버튼을 숨겨야 합니다.');
assert(elements.markdownContent.innerHTML.includes('운영 링크에서 보여야 하는 문서'), '운영 링크에서는 문서 내용이 바로 보여야 합니다.');
