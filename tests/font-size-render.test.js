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
      content: '[font size="24"]큰 글자[/font]',
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

createdItems[0].click();

assert(
  elements.markdownContent.innerHTML.includes('<span style="font-size: 24px;">큰 글자</span>'),
  '학습용 화면에서는 글자 크기 표기를 실제 span 스타일로 렌더링해야 합니다.'
);
