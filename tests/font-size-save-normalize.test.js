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
const tabButtons = ['전체', '규정', '지침', '업무정리'].map(tab => {
  const button = new MockElement();
  button.dataset.tab = tab;
  return button;
});
const createdItems = [];
const saveBodies = [];

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
      return {
        getMarkdown: () => [
          '$$widget0 [font size="24"]큰 글자[/font]$$',
          '\\[font size=\\"18\\"\\]작은 글자\\[/font\\]',
          '\\!\\[image\\]\\(images/edit_escaped.png\\)',
          '![image]images/edit_missing_parens.png',
        ].join('\n'),
        setMarkdown: () => {},
      };
    },
  },
  fetch: async (url, options = {}) => {
    if (url === '/api/save') {
      saveBodies.push(JSON.parse(options.body));
    }
    return {
      ok: true,
      json: async () => ({ message: '웹 반영 완료' }),
    };
  },
  alert: () => {},
  confirm: () => true,
};

context.toastui.Editor.plugin = { colorSyntax: {} };

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
vm.runInNewContext(source, context);

createdItems[0].click();
elements.editBtn.click();

Promise.resolve(elements.saveBtn.click()).then(() => {
  assert.strictEqual(saveBodies.length, 1, '저장 API가 한 번 호출되어야 합니다.');
  assert.strictEqual(
    saveBodies[0].content,
    [
      '[font size="24"]큰 글자[/font]',
      '[font size="18"]작은 글자[/font]',
      '![image](images/edit_escaped.png)',
      '![image](images/edit_missing_parens.png)',
    ].join('\n'),
    '저장 전에 Toast UI가 변형한 글자 크기/이미지 표기를 정상 마크다운으로 정규화해야 합니다.'
  );
}).catch(error => {
  console.error(error);
  process.exit(1);
});
