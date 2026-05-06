document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchInput = document.getElementById('searchInput');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const documentList = document.getElementById('documentList');
    const deployBtn = document.getElementById('deployBtn');
    
    const contentPlaceholder = document.getElementById('contentPlaceholder');
    const markdownViewer = document.getElementById('markdownViewer');
    const docTitle = document.getElementById('docTitle');
    const docCategory = document.getElementById('docCategory');
    const markdownContent = document.getElementById('markdownContent');
    const searchNavigator = document.getElementById('searchNavigator');
    const matchCount = document.getElementById('matchCount');
    const prevMatchBtn = document.getElementById('prevMatchBtn');
    const nextMatchBtn = document.getElementById('nextMatchBtn');
    const appContainer = document.getElementById('appContainer');
    const backBtn = document.getElementById('backBtn');

    // State
    let currentFilter = '전체'; // 전체, 규정, 지침
    let searchQuery = '';
    let activeDocId = null;
    let highlightElements = [];
    let currentHighlightIndex = -1;
    let editor = null;
    const urlParams = new URLSearchParams(window.location.search);
    const isLearningPreview = urlParams.get('preview') === 'learning';
    
    // Editor Elements
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const editorContainer = document.getElementById('editorContainer');

    // Initialize App
    function init() {
        if (isLearningPreview && deployBtn) {
            deployBtn.style.display = 'none';
        }

        // Sort documentsData: 1-x documents numerically first, then alphabetically
        documentsData.sort((a, b) => {
            const matchA = a.title.match(/(?:^|\[)1-(\d+)/);
            const matchB = b.title.match(/(?:^|\[)1-(\d+)/);

            if (matchA && matchB) {
                return parseInt(matchA[1]) - parseInt(matchB[1]);
            } else if (matchA) {
                return -1;
            } else if (matchB) {
                return 1;
            } else {
                return a.title.localeCompare(b.title, 'ko-KR');
            }
        });

        renderDocumentList();
        setupEventListeners();
    }

    // Event Listeners
    function setupEventListeners() {
        // Tab clicks
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.dataset.tab;
                renderDocumentList();
            });
        });

        // Search input
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            renderDocumentList();
        });

        // Trace navigation
        prevMatchBtn.addEventListener('click', () => {
            if (highlightElements.length > 0) {
                currentHighlightIndex = (currentHighlightIndex - 1 + highlightElements.length) % highlightElements.length;
                updateHighlightSelection();
            }
        });

        nextMatchBtn.addEventListener('click', () => {
            if (highlightElements.length > 0) {
                currentHighlightIndex = (currentHighlightIndex + 1) % highlightElements.length;
                updateHighlightSelection();
            }
        });

        // Mobile back button
        backBtn.addEventListener('click', () => {
            appContainer.classList.remove('mobile-view-doc');
        });

        // Deploy button
        if (deployBtn) {
            deployBtn.addEventListener('click', async () => {
                if (!confirm('현재까지의 수정 내용을 링크(웹)에 반영하시겠습니까?\n(약 10초 정도 소요됩니다.)')) {
                    return;
                }

                try {
                    const data = await deployChanges();
                    alert(data.message);
                } catch (e) {
                    alert(e.message);
                    console.error(e);
                }
            });
        }
    }

    async function deployChanges() {
        const originalText = deployBtn ? deployBtn.innerHTML : '';
        if (deployBtn) {
            deployBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 반영 중...';
            deployBtn.disabled = true;
        }

        try {
            const response = await fetch('/api/deploy', { method: 'POST' });
            let data = {};
            try {
                data = await response.json();
            } catch (e) {
                data = {};
            }

            if (!response.ok) {
                throw new Error(data.message ? `웹 반영 오류: ${data.message}` : '웹 반영에 실패했습니다.');
            }

            return data;
        } catch (e) {
            if (e.message && e.message.startsWith('웹 반영')) {
                throw e;
            }
            throw new Error('서버 연결 오류. 로컬 서버(앱_실행하기.bat)로 열었는지 확인하세요.');
        } finally {
            if (deployBtn) {
                deployBtn.innerHTML = originalText;
                deployBtn.disabled = false;
            }
        }
    }

    // Render Document List
    function renderDocumentList() {
        documentList.innerHTML = '';

        // Filter original list based on tab only
        const originalDocs = documentsData.filter(doc => currentFilter === '전체' || doc.category === currentFilter);

        // If there's a search query, filter search results
        let searchResults = [];
        if (searchQuery) {
            documentsData.forEach(doc => {
                const matchesFilter = currentFilter === '전체' || doc.category === currentFilter;
                if (!matchesFilter) return;

                const titleMatch = doc.title.toLowerCase().includes(searchQuery);
                const contentIndex = doc.content.toLowerCase().indexOf(searchQuery);
                
                if (titleMatch || contentIndex !== -1) {
                    let snippet = null;
                    if (contentIndex !== -1) {
                        const start = Math.max(0, contentIndex - 40);
                        const end = Math.min(doc.content.length, contentIndex + 80);
                        snippet = doc.content.substring(start, end).replace(/\n/g, ' ');
                        
                        if (start > 0) snippet = '...' + snippet;
                        if (end < doc.content.length) snippet = snippet + '...';
                        
                        const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
                        snippet = snippet.replace(regex, '<mark>$1</mark>');
                    }
                    searchResults.push({ ...doc, snippet });
                }
            });

            // Render Search Results Header
            const searchHeader = document.createElement('div');
            searchHeader.style.padding = '10px 5px';
            searchHeader.style.fontWeight = 'bold';
            searchHeader.style.color = 'var(--primary-color)';
            searchHeader.style.borderBottom = '1px solid var(--border-color)';
            searchHeader.style.marginBottom = '10px';
            searchHeader.textContent = `검색 결과 (${searchResults.length}건)`;
            documentList.appendChild(searchHeader);

            if (searchResults.length === 0) {
                const noResult = document.createElement('div');
                noResult.style.padding = '10px';
                noResult.style.color = 'var(--text-secondary)';
                noResult.style.fontSize = '0.9rem';
                noResult.textContent = '검색 결과가 없습니다.';
                documentList.appendChild(noResult);
            } else {
                renderItems(searchResults, true);
            }

            // Render Original List Header
            const origHeader = document.createElement('div');
            origHeader.style.padding = '10px 5px';
            origHeader.style.fontWeight = 'bold';
            origHeader.style.color = 'var(--text-secondary)';
            origHeader.style.borderBottom = '1px solid var(--border-color)';
            origHeader.style.marginBottom = '10px';
            origHeader.style.marginTop = '20px';
            origHeader.textContent = `${currentFilter === '업무정리' ? '조제실 업무 정리' : currentFilter} 목록`;
            documentList.appendChild(origHeader);
            
            renderItems(originalDocs, false);
        } else {
            // Just render original list
            if (originalDocs.length === 0) {
                documentList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">문서가 없습니다.</div>';
            } else {
                renderItems(originalDocs, false);
            }
        }
    }

    function renderItems(docs, isSearchResult) {
        docs.forEach(doc => {
            const item = document.createElement('div');
            item.className = `doc-item ${doc.id === activeDocId ? 'active' : ''}`;
            
            const title = document.createElement('div');
            title.className = 'doc-item-title';
            // Highlight query in title if present
            if (searchQuery) {
                const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
                title.innerHTML = doc.title.replace(regex, '<mark>$1</mark>');
            } else {
                title.textContent = doc.title;
            }
            
            const meta = document.createElement('div');
            meta.className = 'doc-item-meta';
            const badge = document.createElement('span');
            badge.className = `badge badge-${doc.category}`;
            badge.textContent = doc.category;
            meta.appendChild(badge);
            
            item.appendChild(title);
            item.appendChild(meta);

            if (doc.snippet) {
                const snippetEl = document.createElement('div');
                snippetEl.className = 'doc-item-snippet';
                snippetEl.innerHTML = doc.snippet;
                item.appendChild(snippetEl);
            }

            // Click event to view document
            item.addEventListener('click', () => {
                // Update active state in list
                document.querySelectorAll('.doc-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                
                // View document
                viewDocument(doc);
            });

            documentList.appendChild(item);
        });
    }

    // View Document Content
    function viewDocument(doc) {
        activeDocId = doc.id;
        
        // Hide placeholder, show viewer
        contentPlaceholder.classList.add('hidden');
        markdownViewer.classList.remove('hidden');

        // Toggle mobile view
        appContainer.classList.add('mobile-view-doc');
        
        // Set metadata
        docTitle.textContent = doc.title;
        docCategory.textContent = doc.category;
        docCategory.className = `badge badge-${doc.category}`;

        // Render Markdown
        // marked.parse() is provided by the CDN script
        try {
            let htmlContent = marked.parse(doc.content, { breaks: true });
            
            // Highlight the search query in the main content if it exists
            if (searchQuery) {
                const regex = new RegExp(`(?![^<]*>)(${escapeRegExp(searchQuery)})`, 'gi');
                htmlContent = htmlContent.replace(regex, '<mark class="search-highlight">$1</mark>');
            }
            
            markdownContent.innerHTML = htmlContent;
        } catch (e) {
            markdownContent.innerHTML = `<div style="color: red;">마크다운 변환 중 오류가 발생했습니다.</div><pre>${doc.content}</pre>`;
        }
        
        // Setup tracing
        if (searchQuery) {
            highlightElements = Array.from(markdownContent.querySelectorAll('mark.search-highlight'));
            if (highlightElements.length > 0) {
                searchNavigator.classList.remove('hidden');
                currentHighlightIndex = 0;
                updateHighlightSelection();
            } else {
                searchNavigator.classList.add('hidden');
                document.querySelector('.main-content').scrollTop = 0;
            }
        } else {
            searchNavigator.classList.add('hidden');
            highlightElements = [];
            document.querySelector('.main-content').scrollTop = 0;
        }
        
        // Reset edit button state when switching documents
        if (editorContainer && markdownContent && editBtn) {
            editorContainer.classList.add('hidden');
            markdownContent.classList.remove('hidden');
            editBtn.style.display = isLearningPreview ? 'none' : 'flex';
        }
    }
    
    // Editor Logic
    // Editor Logic
    if (!isLearningPreview) {
        editBtn.addEventListener('click', () => {
            markdownContent.classList.add('hidden');
            editorContainer.classList.remove('hidden');
            editBtn.style.display = 'none';
            
            const doc = documentsData.find(d => d.id === activeDocId);
            
            if (!editor) {
                editor = new toastui.Editor({
                    el: document.getElementById('toastEditor'),
                    height: '600px',
                    initialEditType: 'wysiwyg',
                    previewStyle: 'vertical',
                    initialValue: doc.content,
                    plugins: [toastui.Editor.plugin.colorSyntax],
                    hooks: {
                        addImageBlobHook: async (blob, callback) => {
                            const formData = new FormData();
                            formData.append('image', blob);
                            try {
                                const response = await fetch('/api/upload', {
                                    method: 'POST',
                                    body: formData
                                });
                                const data = await response.json();
                                callback(data.url, 'image');
                            } catch (err) {
                                console.error('Image upload failed', err);
                                alert('이미지 업로드에 실패했습니다. (앱_실행하기.bat 로 실행 중인지 확인)');
                            }
                        }
                    }
                });
            } else {
                editor.setMarkdown(doc.content);
            }
        });
    }

    cancelBtn.addEventListener('click', () => {
        editorContainer.classList.add('hidden');
        markdownContent.classList.remove('hidden');
        editBtn.style.display = isLearningPreview ? 'none' : 'flex';
    });

    saveBtn.addEventListener('click', async () => {
        const newContent = editor.getMarkdown();
        const doc = documentsData.find(d => d.id === activeDocId);
        doc.content = newContent;
        
        const originalSaveText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 및 웹 반영 중...';
        saveBtn.disabled = true;

        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activeDocId, content: newContent })
            });
            
            if (response.ok) {
                const deployResult = await deployChanges();
                alert(`저장되었습니다.\n${deployResult.message || '웹에도 자동으로 반영되었습니다.'}`);
                editorContainer.classList.add('hidden');
                markdownContent.classList.remove('hidden');
                editBtn.style.display = isLearningPreview ? 'none' : 'flex';
                viewDocument(doc); // Re-render the view
            } else {
                alert('저장에 실패했습니다. 로컬 서버(앱_실행하기.bat)로 열었는지 확인하세요.');
            }
        } catch (e) {
            alert(e.message || '서버 연결 오류. 로컬 서버(앱_실행하기.bat)로 열었는지 확인하세요.');
            console.error(e);
        } finally {
            saveBtn.innerHTML = originalSaveText;
            saveBtn.disabled = false;
        }
    });

    function updateHighlightSelection() {
        if (highlightElements.length === 0) return;

        // Remove active class from all
        highlightElements.forEach(el => el.classList.remove('active-highlight'));

        // Add to current
        const currentEl = highlightElements[currentHighlightIndex];
        currentEl.classList.add('active-highlight');

        // Update text
        matchCount.textContent = `${currentHighlightIndex + 1} / ${highlightElements.length}`;

        // Scroll
        setTimeout(() => {
            const container = document.querySelector('.main-content');
            const highlightPos = currentEl.offsetTop;
            container.scrollTo({ top: highlightPos - 60, behavior: 'smooth' });
        }, 50);
    }

    // Helper for regex
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    // Run
    init();
});
