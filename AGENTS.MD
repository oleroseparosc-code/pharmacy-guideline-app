# Project Notes

## System Overview

This project is the hospital pharmacy guideline learning app.

- App root: `C:\Users\duih\Desktop\코딩\병원_약제팀_학습앱`
- PDF source folder: `C:\Users\duih\Desktop\코딩\규정 지침 앱`
- Markdown conversion folder: `C:\Users\duih\Desktop\코딩\규정 지침 앱_마크다운`
- Main app files: `index.html`, `app.js`, `style.css`
- Embedded document data: `data.js`
- Local server/API: `server.py`
- Extracted/uploaded images: `images\`
- Manual edit preservation file: `custom_edits.json`

## Architecture

- PDF documents are converted into Markdown and image assets with Python scripts using `pymupdf4llm`.
- The browser app loads all document content from `data.js` through the global `documentsData` array.
- Markdown is rendered in the browser with `marked.js`.
- The UI supports category tabs, full-text search, search result snippets, in-document highlighting, document viewing, and Toast UI based editing.
- The local server serves static files and provides API routes for save, upload, and deploy.

## Data Flow

1. PDFs live in `규정 지침 앱`.
2. Conversion scripts extract Markdown and images.
3. `data.js` is regenerated with document objects.
4. The browser reads `data.js` and renders documents.
5. Web editor saves update both `data.js` and `custom_edits.json`.
6. Cleanup/regeneration scripts reapply `custom_edits.json` so manual edits are not lost.

## Important Files

- `extract_with_images.py`: bulk PDF to `data.js` conversion with image extraction.
- `fix_images2.py`: title cleanup, text cleanup, logo image removal, missing image append, and custom edit reapplication.
- `convert_pdf.py`: PDF to Markdown file conversion.
- `rebuild_new_docs.py`: targeted hybrid rebuild workflow for selected PDFs.
- `auto_sync.py`: watches source PDFs, regenerates data, commits, and pushes changes.
- `server.py`: local server on port 8000 with:
  - `POST /api/save`
  - `POST /api/upload`
  - `POST /api/deploy`

## Current Data Snapshot

- Total documents: 47
- Categories:
  - `지침`: 37
  - `규정`: 8
  - `업무정리`: 2
- Current known manual edit in `custom_edits.json`:
  - `조제실 업무 정리_추긴 외퇴 7988`

## Git/Deploy

- The git repository is inside `병원_약제팀_학습앱`.
- Main branch: `main`
- Remote: `https://github.com/oleroseparosc-code/pharmacy-guideline-app.git`
- The in-app deploy button calls `/api/deploy`, which runs `git add .`, commits if there are changes, then pushes to `origin main`.
- The public website link must never change during deployment. Do not rename the repository, change the GitHub Pages source, alter the deploy branch, move the app to a different hosting target, or introduce any deployment flow that changes the existing URL unless the user explicitly asks for a URL migration.

## Working Rules

- Preserve `custom_edits.json`; it protects web editor changes from being overwritten by PDF regeneration.
- Be careful with absolute paths. Many scripts depend on the current folder layout under `C:\Users\duih\Desktop\코딩`.
- Read and write source files as UTF-8.
- Prefer scoped edits. Do not regenerate `data.js` unless the task explicitly needs data rebuild or document import.
- Before changing extraction/cleanup scripts, check whether the change could overwrite manual edits.
- After JavaScript edits, run `node --check app.js` and, if `data.js` changed, `node --check data.js`.
- After Python edits, run `python -m py_compile` on the changed Python files.

## Known Issues / Risks

- `auto_sync.bat` appears to contain a garbled path and may fail if executed as-is.
- `/api/save` currently rejects empty content because it checks `if not doc_id or not new_content`.
- The app depends on external CDN resources for fonts, icons, Markdown parsing, and Toast UI Editor.
- Several scripts use hard-coded absolute Windows paths.
