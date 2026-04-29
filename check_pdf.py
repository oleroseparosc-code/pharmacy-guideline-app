import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

pdf_path = r'c:\Users\duih\Desktop\코딩\규정 지침 앱\조제실 업무 정리_주친 외퇴 7988.pdf'
doc = fitz.open(pdf_path)

print("=== 각 페이지 상세 분석 (1-based) ===")
for i, page in enumerate(doc):
    pnum_1based = i + 1
    imgs = page.get_images(full=True)
    # get all image info
    real_imgs = []
    for img_info in imgs:
        xref = img_info[0]
        bi = doc.extract_image(xref)
        real_imgs.append((bi['width'], bi['height'], len(bi['image']), bi['ext']))
    
    text = page.get_text("text")[:80].replace('\n', ' ')
    print(f"Page {pnum_1based}: 이미지={len(real_imgs)}개 | {text}")
    for ri in real_imgs:
        print(f"  -> {ri[0]}x{ri[1]} {ri[3]} {ri[2]}bytes (logo={ri[2] in {3906,14015,16445}})")

doc.close()
