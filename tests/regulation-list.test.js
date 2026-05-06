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
const tabButtons = ['전체', '규정', '지침', '업무정리'].map(tab => {
  const button = new MockElement();
  button.dataset.tab = tab;
  return button;
});

const renderedTitles = [];
elements.documentList.appendChild = child => {
  elements.documentList.children.push(child);
  if (child.className && child.className.includes('doc-item')) {
    renderedTitles.push(child.children[0].textContent);
  }
  return child;
};

const regulationCategory = new String('규정');

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
      if (selector === '.doc-item') return [];
      return [];
    },
    createElement: () => new MockElement(),
  },
  documentsData: [
    { id: 'doc-1', title: '[4-1]의약품관리규정', category: regulationCategory, content: '4-1 내용' },
    { id: 'doc-2', title: '[4-2]의약품선정및재고관리규정', category: regulationCategory, content: '4-2 내용' },
    { id: 'doc-3', title: '1-1.근무지침', category: '지침', content: '지침 내용' },
  ],
  marked: { parse: markdown => `<p>${markdown}</p>` },
  toastui: { Editor: function Editor() {} },
};
context.toastui.Editor.plugin = { colorSyntax: {} };

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
vm.runInNewContext(source, context);

renderedTitles.length = 0;
tabButtons.find(button => button.dataset.tab === '규정').click();

assert.deepStrictEqual(
  renderedTitles,
  ['[4-1]의약품관리규정', '[4-2]의약품선정및재고관리규정'],
  '규정 탭에는 편집기 데이터의 4-1 규정 문서가 빠지지 않고 보여야 합니다.'
);
