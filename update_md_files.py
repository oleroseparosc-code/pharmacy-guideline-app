"""
규정 지침 앱_마크다운 폴더의 3개 파일도 동일하게 고해상도 이미지 + 정제된 텍스트로 업데이트
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import os, re, json
import fitz

PDF_DIR = r"c:\Users\duih\Desktop\코딩\규정 지침 앱"
MD_DIR  = r"c:\Users\duih\Desktop\코딩\규정 지침 앱_마크다운"
APP_DIR = r"c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱"
IMG_DIR = os.path.join(APP_DIR, "images")

TARGET_PDFS = [
    "조제실 업무 정리_주친 외퇴 7988.pdf",
    "외래약국 업무 내용 정리.pdf",
    "과내약 접수 시 주의 사항 및 약품 불출 처리 기준 _20260429.pdf",
]

REMOVE_PATTERNS = [
    r'동국대학교\s*일산병원\s*약제팀',
    r'동국대학교\s*약제팀',
    r'일산병원\s*약제팀',
    r'^\s*-\s*\d+\s*-\s*$',
    r'^\s*\d+\s*(?:page|페이지)?\s*$',
    r'^\s*[–—-]\s*\d+\s*[–—-]\s*$',
]
LOGO_SIZES = {3906, 14015, 16445}

def safe_filename(s):
    return re.sub(r'[\\/:*?"<>|]', '_', s)

def clean_text(text):
    lines = text.splitlines()
    cleaned = []
    for line in lines:
        if any(re.search(p, line, re.IGNORECASE) for p in REMOVE_PATTERNS):
            continue
        cleaned.append(line)
    return '\n'.join(cleaned)

def render_page_to_image(page, stem, page_num, dpi=180):
    mat = fitz.Matrix(dpi/72, dpi/72)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    fname = f"{safe_filename(stem)}_page{page_num:02d}_full.png"
    fpath = os.path.join(IMG_DIR, fname)
    pix.save(fpath)
    return f"images/{fname}"

def process_pdf(pdf_name):
    pdf_path = os.path.join(PDF_DIR, pdf_name)
    stem = os.path.splitext(pdf_name)[0]
    doc = fitz.open(pdf_path)
    parts = []

    for pnum, page in enumerate(doc, 1):
        text = clean_text(page.get_text("text"))
        imgs = page.get_images(full=True)

        lines = text.splitlines()
        result = []
        prev_blank = False
        for l in lines:
            ib = l.strip() == ''
            if ib and prev_blank:
                continue
            result.append(l)
            prev_blank = ib
        clean = '\n'.join(result).strip()

        pmd = ''
        if clean:
            pmd += clean + '\n\n'

        embedded = []
        for img_info in imgs:
            xref = img_info[0]
            bi = doc.extract_image(xref)
            if len(bi['image']) in LOGO_SIZES:
                continue
            embedded.append((xref, bi))

        if embedded:
            use_full = len(embedded) >= 2 or any(b['width'] > 500 or b['height'] > 300 for _, b in embedded)
            if use_full:
                ip = render_page_to_image(page, stem, pnum)
                pmd += f"\n![페이지 {pnum} 도표/그림]({ip})\n\n"
            else:
                for xref, bi in embedded:
                    fname = f"{safe_filename(stem)}_p{pnum:02d}_x{xref}.{bi['ext']}"
                    with open(os.path.join(IMG_DIR, fname), 'wb') as f:
                        f.write(bi['image'])
                    pmd += f"\n![그림](images/{fname})\n\n"

        parts.append(pmd)

    doc.close()
    full_md = '\n---\n\n'.join(parts)
    full_md = re.sub(r'\n{4,}', '\n\n\n', full_md)
    return full_md, stem

for pdf_name in TARGET_PDFS:
    stem = os.path.splitext(pdf_name)[0]
    md_path = os.path.join(MD_DIR, stem + '.md')
    print(f"마크다운 업데이트: {stem}")
    md, _ = process_pdf(pdf_name)
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(md)
    print(f"  → 저장 완료: {len(md)} chars")

print("\n✅ 마크다운 파일 업데이트 완료!")
