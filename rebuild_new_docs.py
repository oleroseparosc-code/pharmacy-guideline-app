"""
하이브리드 재처리:
1. pymupdf4llm.to_markdown()으로 텍스트 + 표 구조 추출 (검색 가능)
2. 내장 이미지가 있는 페이지는 해당 페이지를 고해상도 PNG로 렌더링해서 시각 보조 추가
3. "picture intentionally omitted" 표시를 실제 이미지로 교체
4. 페이지 번호, 동국대학교 약제팀 헤더 제거
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
import re
import json
import uuid
import fitz
import pymupdf4llm

# ──────────────────────────────────────────
PDF_DIR = r"c:\Users\duih\Desktop\코딩\규정 지침 앱"
APP_DIR = r"c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱"
MD_DIR  = r"c:\Users\duih\Desktop\코딩\규정 지침 앱_마크다운"
IMG_DIR = os.path.join(APP_DIR, "images")
DATA_JS = os.path.join(APP_DIR, "data.js")

TARGET_PDFS = [
    "조제실 업무 정리_주친 외퇴 7988.pdf",
    "외래약국 업무 내용 정리.pdf",
    "과내약 접수 시 주의 사항 및 약품 불출 처리 기준 _20260429.pdf",
]

LOGO_SIZES = {3906, 14015, 16445}

# 제거할 텍스트 패턴
STRIP_PATTERNS = [
    r'동국대학교\s*일산병원\s*약제팀',
    r'동국대학교\s*약제팀',
    r'일산병원\s*약제팀',
    r'^\s*-\s*\d+\s*-\s*$',
    r'^\s*\d+\s*(?:page|페이지)?\s*$',
    r'^\s*[–—-]\s*\d+\s*[–—-]\s*$',
]

def safe_filename(s):
    return re.sub(r'[\\/:*?"<>|]', '_', s)

def clean_content(text):
    """헤더/푸터/페이지번호 제거"""
    lines = text.splitlines()
    out = []
    for line in lines:
        if any(re.search(p, line, re.IGNORECASE) for p in STRIP_PATTERNS):
            continue
        out.append(line)
    # 연속 빈 줄 3개 이상 → 2개
    result = re.sub(r'\n{4,}', '\n\n\n', '\n'.join(out))
    return result.strip()

def render_page_image(page, stem, pnum, dpi=180):
    """페이지를 고해상도 PNG로 렌더링, 상대 경로 반환"""
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    fname = f"{safe_filename(stem)}_page{pnum:02d}_full.png"
    fpath = os.path.join(IMG_DIR, fname)
    pix.save(fpath)
    return f"images/{fname}", fname

def process_pdf(pdf_name):
    pdf_path = os.path.join(PDF_DIR, pdf_name)
    stem = os.path.splitext(pdf_name)[0]
    doc = fitz.open(pdf_path)

    # 1) pymupdf4llm로 텍스트(+표 구조) 추출
    #    page_chunks=True로 하면 페이지별 결과를 얻을 수 있음
    chunks = pymupdf4llm.to_markdown(pdf_path, page_chunks=True)

    # 2) 이미지가 있는 페이지 번호 목록 수집 (로고 제외) - 1-based 키 사용
    pages_with_images = {}  # page_num(1-based) -> list of real images
    for pnum_0based, page in enumerate(doc):
        pnum_1based = pnum_0based + 1
        real_imgs = []
        for img_info in page.get_images(full=True):
            xref = img_info[0]
            bi = doc.extract_image(xref)
            if len(bi['image']) not in LOGO_SIZES:
                real_imgs.append((bi['width'], bi['height']))
        if real_imgs:
            pages_with_images[pnum_1based] = real_imgs

    # 3) 페이지별 처리: 텍스트 + 이미지 조합
    result_parts = []

    for chunk in chunks:
        # page_number는 1-based
        pnum_1based = chunk['metadata']['page_number']  # 1-based
        text = chunk['text']

        # "picture intentionally omitted" 패턴 감지
        has_omitted = bool(re.search(r'picture.*?intentionally omitted', text, re.IGNORECASE))

        # pages_with_images도 1-based 키이므로 직접 비교
        if pnum_1based in pages_with_images or has_omitted:
            # 이미지가 있는 페이지: doc[pnum_1based - 1] (0-based 인덱스)
            page = doc[pnum_1based - 1]
            img_rel, _ = render_page_image(page, stem, pnum_1based)

            # "picture intentionally omitted" 표시를 실제 이미지로 교체
            text = re.sub(
                r'\*\*==>.*?picture.*?intentionally omitted.*?<==\*\*\n?',
                f'\n![페이지 {pnum_1based} 도표/그림]({img_rel})\n\n',
                text,
                flags=re.IGNORECASE | re.DOTALL
            )
            text = re.sub(
                r'==>.*?picture.*?intentionally omitted.*?<==',
                f'\n![페이지 {pnum_1based} 도표/그림]({img_rel})\n\n',
                text,
                flags=re.IGNORECASE
            )
            # 이미지 링크가 아직 없으면 끝에 추가
            if img_rel not in text:
                text = text.rstrip() + f'\n\n![페이지 {pnum_1based} 도표/그림]({img_rel})\n'

        result_parts.append(text)

    doc.close()

    # 4) 합치고 정제
    full_md = '\n\n'.join(result_parts)
    full_md = clean_content(full_md)

    return full_md, stem


def main():
    os.makedirs(IMG_DIR, exist_ok=True)

    # 기존 data.js 로드
    with open(DATA_JS, 'r', encoding='utf-8') as f:
        js = f.read()
    json_str = js.replace('const documentsData = ', '').strip().rstrip(';')
    docs = json.loads(json_str)

    for pdf_name in TARGET_PDFS:
        stem = os.path.splitext(pdf_name)[0]
        print(f"\n▶ 처리 중: {pdf_name}")
        md, title = process_pdf(pdf_name)

        # 검색 가능성 검증
        if '재불출' in md or '미확인' in md:
            print("  ✓ '미확인 재불출' 키워드 검색 가능 확인!")
        if '결제' in md or '금액' in md:
            print("  ✓ 금액/결제 관련 키워드 검색 가능 확인!")

        print(f"  → 마크다운 생성: {len(md):,} chars")

        # data.js 업데이트
        updated = False
        for doc in docs:
            if stem in doc['title'] or doc['title'] in stem:
                doc['content'] = md
                doc['title'] = stem
                if '규정' in stem:
                    doc['category'] = '규정'
                elif '업무 정리' in stem or '업무 내용 정리' in stem:
                    doc['category'] = '업무정리'
                else:
                    doc['category'] = '지침'
                updated = True
                print(f"  → data.js 업데이트: '{doc['title']}'")
                break

        if not updated:
            cat = ('규정' if '규정' in stem else
                   '업무정리' if ('업무 정리' in stem or '업무 내용 정리' in stem) else
                   '지침')
            docs.append({'id': str(uuid.uuid4()), 'title': stem, 'category': cat, 'content': md})
            print(f"  → data.js 새 문서 추가")

        # 마크다운 파일도 업데이트
        md_path = os.path.join(MD_DIR, stem + '.md')
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(md)
        print(f"  → 마크다운 파일 저장: {md_path}")

    # data.js 저장
    new_js = 'const documentsData = ' + json.dumps(docs, ensure_ascii=False, indent=2) + ';\n'
    with open(DATA_JS, 'w', encoding='utf-8') as f:
        f.write(new_js)
    print(f"\n✅ 완료! data.js 저장 (총 {len(docs)}개 문서)")


if __name__ == '__main__':
    main()
