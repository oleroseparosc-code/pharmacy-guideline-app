import os
import glob
try:
    import pymupdf4llm
except ImportError:
    print("pymupdf4llm is not installed. Please install it with 'pip install pymupdf4llm'.")
    exit(1)

def convert_pdfs_to_markdown(source_dir, dest_dir):
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir)
        print(f"Created directory: {dest_dir}")

    pdf_files = glob.glob(os.path.join(source_dir, "*.pdf"))
    
    if not pdf_files:
        print(f"No PDF files found in {source_dir}")
        return

    print(f"Found {len(pdf_files)} PDF files to convert.")

    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        base_name = os.path.splitext(filename)[0]
        md_filename = f"{base_name}.md"
        md_path = os.path.join(dest_dir, md_filename)
        
        print(f"Converting {filename}...")
        try:
            # Convert PDF to markdown
            md_text = pymupdf4llm.to_markdown(pdf_path)
            
            # Write markdown to file
            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(md_text)
            print(f"Successfully converted and saved to {md_path}")
        except Exception as e:
            print(f"Error converting {filename}: {e}")

if __name__ == "__main__":
    source_folder = r"c:\Users\duih\Desktop\코딩\규정 지침 앱"
    dest_folder = r"c:\Users\duih\Desktop\코딩\규정 지침 앱_마크다운"
    convert_pdfs_to_markdown(source_folder, dest_folder)
    print("Conversion complete.")
