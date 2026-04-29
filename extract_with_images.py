import os
import glob
import json
import uuid
import pymupdf4llm

def process_pdfs_with_images(source_dir, output_js_file):
    pdf_files = glob.glob(os.path.join(source_dir, "*.pdf"))
    documents = []

    # Ensure images directory exists relative to current working directory
    # which will be '병원_약제팀_학습앱'
    if not os.path.exists("images"):
        os.makedirs("images")

    print(f"Found {len(pdf_files)} PDF files to process with images.")

    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        title = os.path.splitext(filename)[0]
        
        category = "지침"
        if "규정" in title:
            category = "규정"
        elif "업무 정리" in title or "업무 내용 정리" in title:
            category = "업무정리"
            
        print(f"Converting {filename}...")
        try:
            # write_images=True extracts images, image_path="images" puts them in the images/ folder
            md_text = pymupdf4llm.to_markdown(pdf_path, write_images=True, image_path="images", image_format="png")
            
            documents.append({
                "id": str(uuid.uuid4()),
                "title": title,
                "category": category,
                "content": md_text
            })
        except Exception as e:
            print(f"Error converting {filename}: {e}")
            
    # Write to data.js
    js_content = "const documentsData = " + json.dumps(documents, ensure_ascii=False, indent=2) + ";\n"
    with open(output_js_file, 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print(f"Successfully processed {len(documents)} documents and saved to {output_js_file}")

if __name__ == "__main__":
    # Source is absolute
    source_folder = r"c:\Users\duih\Desktop\코딩\규정 지침 앱"
    # Output is data.js in current directory
    output_js = "data.js"
    
    process_pdfs_with_images(source_folder, output_js)
