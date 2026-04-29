import os
import json
import glob
import uuid

def parse_markdown_files(source_dir, output_file):
    md_files = glob.glob(os.path.join(source_dir, "*.md"))
    documents = []

    for file_path in md_files:
        filename = os.path.basename(file_path)
        title = os.path.splitext(filename)[0]
        
        # Determine category based on filename
        category = "지침"
        if "규정" in title:
            category = "규정"
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        documents.append({
            "id": str(uuid.uuid4()),
            "title": title,
            "category": category,
            "content": content
        })
        
    # Write to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(documents, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully processed {len(documents)} documents and saved to {output_file}")

if __name__ == "__main__":
    source_folder = r"c:\Users\duih\Desktop\코딩\규정 지침 앱_마크다운"
    output_json = r"c:\Users\duih\Desktop\코딩\documents.json"
    parse_markdown_files(source_folder, output_json)
