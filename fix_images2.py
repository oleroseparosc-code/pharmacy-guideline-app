import os
import json
import re

try:
    from pyzbar.pyzbar import decode
    from PIL import Image
    HAS_PYZBAR = True
except ImportError:
    HAS_PYZBAR = False

data_js_path = r"c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱\data.js"
with open(data_js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

json_str = js_content.replace('const documentsData = ', '').strip()
if json_str.endswith(';'):
    json_str = json_str[:-1]

docs = json.loads(json_str)

def extract_prefix(title):
    m = re.match(r'([\[\]0-9\-]+)', title)
    if m:
        return m.group(1).strip('-').strip('_')
    return None

pdf_dir = r"c:\Users\duih\Desktop\코딩\규정 지침 앱"
pdf_files = [f for f in os.listdir(pdf_dir) if f.endswith('.pdf')]
prefix_to_correct_title = {}
for f in pdf_files:
    title = f.replace('.pdf', '')
    prefix = extract_prefix(title)
    if prefix:
        prefix_to_correct_title[prefix] = title

images_dir = r"c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱\images"
images = os.listdir(images_dir)

for doc in docs:
    prefix = extract_prefix(doc['title'])
    if not prefix: continue
    
    # Fix the garbled title using the actual PDF filename
    if prefix in prefix_to_correct_title:
        doc['title'] = prefix_to_correct_title[prefix]

# 수동 타이틀 오버라이드 (PDF 파일명 오타 등 수정)
TITLE_OVERRIDES = {
    '조제실 업무 정리_추긴 외퇴 7988': '조제실 업무 정리_추긴 외퇴 7988',
    '과내약 접수 시 주의 사항 및 약품 불출 처리 기준 _20260429': '과내약 접수 시 주의 사항 및 약품 불출 처리 기준',
}
for doc in docs:
    if doc['title'] in TITLE_OVERRIDES:
        doc['title'] = TITLE_OVERRIDES[doc['title']]

for doc in docs:
    # 모든 문서에 텍스트 정제 적용 (prefix 유무 무관)

    # Text Cleanup (Remove headers, specific strings, etc)
    content = doc['content']
    
    # 1. Remove '동국대학교일산병원 약제팀' and variants
    content = content.replace('동국대학교일산병원 약제팀', '')
    content = content.replace('동국대학교 일산병원 약제팀', '')
    content = content.replace('동국대학교 약제팀', '')
    content = content.replace('일산병원 약제팀', '')
    
    # 1b. Remove standalone page numbers (e.g. "- 1 -", "- 2 -", lone digit lines, or with bold/italic markers)
    content = re.sub(r'^\s*[*_]*\s*[\-–—]?\s*\d+\s*[\-–—]?\s*[*_]*\s*$', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*[*_]*\s*(?:page|페이지)\s*\d+\s*[*_]*\s*$', '', content, flags=re.IGNORECASE|re.MULTILINE)
    content = re.sub(r'^\s*[*_]*\s*\d+\s*(?:page|페이지)\s*[*_]*\s*$', '', content, flags=re.IGNORECASE|re.MULTILINE)
    
    # 1c. Remove '동국대학교일산병원' left over in headers
    content = re.sub(r'^\s*[*_]*\s*동국대학교\s*일산병원\s*[*_]*\s*$', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*[*_]*\s*약제팀\s*[*_]*\s*$', '', content, flags=re.MULTILINE)
    
    # 2. Fix false headers
    # Starts with circled numbers
    content = re.sub(r'^#+\s+([①-⑩].*)$', r'- \1', content, flags=re.MULTILINE)
    # Ends with verb
    content = re.sub(r'^#+\s+(.*(?:한다|않는다|삼간다|요함|입니다|합니다|됩니다)[.]?\s*)$', r'- \1', content, flags=re.MULTILINE)
    # Remove empty headers
    content = re.sub(r'^#+\s+$', '', content, flags=re.MULTILINE)
    
    # 3. Remove Logo Images
    # We found that the logo image comes in exactly [3906, 14015, 16445] bytes.
    # We will remove any markdown image link that points to an image of this size.
    def replace_logo(m):
        alt = m.group(1)
        img_path = m.group(2)
        full_path = os.path.join(r"c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱", img_path)
        if os.path.exists(full_path) and os.path.getsize(full_path) in [3906, 14015, 16445]:
            return '' # remove it
        # encode spaces in the image path for marked.js
        encoded_path = img_path.replace(' ', '%20')
        return f"![{alt}]({encoded_path})" # keep it and encode
    
    content = re.sub(r'!\[([^\]]*)\]\((images/[^\)]+)\)', replace_logo, content)
    
    doc['content'] = content

    # prefix 있는 문서만 이미지 자동 매칭 (1-x 형태 파일들)
    prefix = extract_prefix(doc['title'])
    if not prefix:
        continue

    # Find all images that match the numeric prefix!
    # For example '1-9' matches '1-9._...'
    # but be careful that '1-1' does not match '1-11'
    doc_images = [img for img in images if img.startswith(prefix + '.') or img.startswith(prefix + '_')]
    
    for img in doc_images:
        # Don't append if it's the logo size
        full_path = os.path.join(images_dir, img)
        if os.path.exists(full_path) and os.path.getsize(full_path) in [3906, 14015, 16445]:
            continue
            
        img_link = f"images/{img}"
        if img_link not in doc['content']:
            doc['content'] += f"\n\n![첨부된 그림]({img_link})\n"
            
        if HAS_PYZBAR:
            try:
                decoded = decode(Image.open(full_path))
                for d in decoded:
                    url = d.data.decode('utf-8')
                    if url.startswith('http') and url not in doc['content']:
                        doc['content'] += f"\n[📺 관련된 영상 보러가기 (여기를 클릭하세요)]({url})\n"
            except Exception:
                pass

# Apply user manual edits
edits_path = os.path.join(r"c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱", "custom_edits.json")
if os.path.exists(edits_path):
    with open(edits_path, 'r', encoding='utf-8') as f:
        try:
            custom_edits = json.load(f)
            for doc in docs:
                if doc['title'] in custom_edits:
                    doc['content'] = custom_edits[doc['title']]
        except json.JSONDecodeError:
            pass

new_js_content = "const documentsData = " + json.dumps(docs, ensure_ascii=False, indent=2) + ";\n"
with open(data_js_path, 'w', encoding='utf-8') as f:
    f.write(new_js_content)

print("Fixed titles, cleaned text, removed logos, and appended missing images!")
