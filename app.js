document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchInput = document.getElementById('searchInput');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const documentList = document.getElementById('documentList');
    
    const contentPlaceholder = document.getElementById('contentPlaceholder');
    const markdownViewer = document.getElementById('markdownViewer');
    const docTitle = document.getElementById('docTitle');
    const docCategory = document.getElementById('docCategory');
    const markdownContent = document.getElementById('markdownContent');
    const searchNavigator = document.getElementById('searchNavigator');
    const matchCount = document.getElementById('matchCount');
    const prevMatchBtn = document.getElementById('prevMatchBtn');
    const nextMatchBtn = document.getElementById('nextMatchBtn');

    // State
    let currentFilter = '전체'; // 전체, 규정, 지침
    let searchQuery = '';
    let activeDocId = null;
    let highlightElements = [];
    let currentHighlightIndex = -1;

    // Initialize App
    function init() {
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
            origHeader.textContent = `${currentFilter} 목록`;
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
        
        // Set metadata
        docTitle.textContent = doc.title;
        docCategory.textContent = doc.category;
        docCategory.className = `badge badge-${doc.category}`;

        // Render Markdown
        // marked.parse() is provided by the CDN script
        try {
            let htmlContent = marked.parse(doc.content);
            
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
    }

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
