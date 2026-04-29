import os
import json
import re

# Load old titles from documents.json
old_docs_path = r"c:\Users\duih\Desktop\코딩\documents.json"
old_titles = []
if os.path.exists(old_docs_path):
    with open(old_docs_path, 'r', encoding='utf-8') as f:
        old_docs = json.load(f)
        old_titles = [d['title'] for d in old_docs]

# Load current data.js
data_js_path = r"c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱\data.js"
with open(data_js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

# Extract json
json_str = js_content.replace('const documentsData = ', '').strip()
if json_str.endswith(';'):
    json_str = json_str[:-1]

docs = json.loads(json_str)

# Helper to extract English/numeric prefix for matching
def extract_prefix(title):
    m = re.match(r'([\[\]0-9\-]+)', title)
    if m:
        return m.group(1)
    return title

# Create a mapping from prefix to correct title
prefix_to_title = {extract_prefix(t): t for t in old_titles}

images_dir = r"c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱\images"
images = os.listdir(images_dir)

for doc in docs:
    garbled_title = doc['title']
    prefix = extract_prefix(garbled_title)
    
    # Fix the title
    if prefix in prefix_to_title:
        doc['title'] = prefix_to_title[prefix]
        if "규정" in doc['title']:
            doc['category'] = "규정"
        else:
            doc['category'] = "지침"
            
    # Find all images for this doc using the garbled title (since images were saved with it)
    doc_images = [img for img in images if img.startswith(garbled_title)]
    
    for img in doc_images:
        img_link = f"images/{img}"
        if img_link not in doc['content']:
            # Append it
            doc['content'] += f"\n\n![그림 첨부됨]({img_link})\n"

# Rewrite data.js
new_js_content = "const documentsData = " + json.dumps(docs, ensure_ascii=False, indent=2) + ";\n"
with open(data_js_path, 'w', encoding='utf-8') as f:
    f.write(new_js_content)

print("Fixed data.js by repairing titles and appending missing images.")
