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
    this.value = '';
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

  dispatch(event) {
    return this.listeners[event]({ target: this });
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
  'fontSizeSelect',
  'applyFontSizeBtn',
];

const elements = Object.fromEntries(elementIds.map(id => [id, new MockElement(id)]));
elements.fontSizeSelect.value = '24';

const tabButtons = ['전체', '규정', '지침', '업무정리'].map(tab => {
  const button = new MockElement();
  button.dataset.tab = tab;
  return button;
});
const createdItems = [];
let editorApi;

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
      editorApi = {
        getSelectedText: () => '선택 글자',
        replaceSelection: value => {
          editorApi.replaced = value;
        },
        getMarkdown: () => editorApi.replaced || '원본 내용',
        setMarkdown: () => {},
        focus: () => {
          editorApi.focused = true;
        },
      };
      return editorApi;
    },
  },
  alert: message => {
    context.lastAlert = message;
  },
};

context.toastui.Editor.plugin = { colorSyntax: {} };

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
vm.runInNewContext(source, context);

createdItems[0].click();
elements.editBtn.click();
elements.applyFontSizeBtn.click();

assert.strictEqual(
  editorApi.replaced,
  '<span style="font-size: 24px;">선택 글자</span>',
  '선택한 글자를 지정한 크기의 span으로 감싸야 합니다.'
);
assert.strictEqual(editorApi.focused, true, '글자 크기 적용 후 편집기로 포커스를 돌려야 합니다.');
