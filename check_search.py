"""
검사용: 특정 PDF 페이지에서 pymupdf4llm vs get_text 비교
미확인 재불출 키워드가 어디서 추출되는지 확인
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
import pymupdf4llm

pdf_path = r'c:\Users\duih\Desktop\코딩\규정 지침 앱\조제실 업무 정리_추긴 외퇴 7988.pdf'
doc = fitz.open(pdf_path)

print("=== get_text 방식으로 '재불출' 검색 ===")
for i, page in enumerate(doc, 1):
    t = page.get_text("text")
    if '재불출' in t or '미확인' in t or 'D-report' in t or 'D보고' in t:
        print(f"Page {i}에서 발견 (get_text)")
        # 관련 줄 출력
        for line in t.splitlines():
            if '재불출' in line or '미확인' in line or 'D-report' in line:
                print(f"  >> {line.strip()}")
doc.close()

print()
print("=== pymupdf4llm 방식으로 '재불출' 검색 ===")
md = pymupdf4llm.to_markdown(pdf_path)
if '재불출' in md or '미확인' in md:
    for line in md.splitlines():
        if '재불출' in line or '미확인' in line or 'D-report' in line:
            print(f"  >> {line.strip()[:100]}")
else:
    print("  pymupdf4llm에서도 미발견")
    
print()
print("=== 전체 pymupdf4llm 추출 첫 3000자 ===")
print(md[:3000])
