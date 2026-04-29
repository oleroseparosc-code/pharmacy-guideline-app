import http.server
import socketserver
import json
import os
import urllib.parse
import uuid
from email.message import EmailMessage
from email.parser import BytesParser

PORT = 8000
DIRECTORY = r"c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱"

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        if self.path == '/api/save':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError:
                self.send_response(400)
                self.end_headers()
                return
            
            doc_id = data.get('id')
            new_content = data.get('content')
            
            if not doc_id or not new_content:
                self.send_response(400)
                self.end_headers()
                return
                
            # data.js 업데이트
            data_js_path = os.path.join(DIRECTORY, 'data.js')
            try:
                with open(data_js_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                json_str = content.replace('const documentsData = ', '').strip().rstrip(';')
                docs = json.loads(json_str)
                
                doc_title = None
                for doc in docs:
                    if doc['id'] == doc_id:
                        doc['content'] = new_content
                        doc_title = doc['title']
                        break
                        
                if doc_title:
                    new_js_content = "const documentsData = " + json.dumps(docs, ensure_ascii=False, indent=2) + ";\n"
                    with open(data_js_path, 'w', encoding='utf-8') as f:
                        f.write(new_js_content)
                    
                    # custom_edits.json 에도 저장하여 자동업데이트 시 덮어써지지 않도록 함
                    edits_path = os.path.join(DIRECTORY, 'custom_edits.json')
                    edits = {}
                    if os.path.exists(edits_path):
                        with open(edits_path, 'r', encoding='utf-8') as f:
                            edits = json.load(f)
                    
                    edits[doc_title] = new_content
                    with open(edits_path, 'w', encoding='utf-8') as f:
                        json.dump(edits, f, ensure_ascii=False, indent=2)
                        
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))
                else:
                    self.send_response(404)
                    self.end_headers()
            except Exception as e:
                print("Error saving:", e)
                self.send_response(500)
                self.end_headers()

        elif self.path == '/api/upload':
            try:
                content_type = self.headers.get('Content-Type')
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                
                # Parse multipart using email parser
                msg = BytesParser().parsebytes(
                    f"Content-Type: {content_type}\r\n\r\n".encode('utf-8') + body
                )
                
                img_data = None
                img_filename = 'image.png'
                
                if msg.is_multipart():
                    for part in msg.get_payload():
                        if part.get_filename():
                            img_filename = part.get_filename()
                            img_data = part.get_payload(decode=True)
                            break
                            
                if img_data:
                    ext = os.path.splitext(img_filename)[1]
                    if not ext:
                        ext = '.png'
                    img_name = f"edit_{uuid.uuid4().hex}{ext}"
                    img_path = os.path.join(DIRECTORY, 'images', img_name)
                    
                    os.makedirs(os.path.dirname(img_path), exist_ok=True)
                    
                    with open(img_path, 'wb') as f:
                        f.write(img_data)
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'url': f'images/{img_name}'}).encode('utf-8'))
                    return
            except Exception as e:
                print("Error uploading:", e)
                self.send_response(500)
                self.end_headers()
                return

            self.send_response(400)
            self.end_headers()

Handler = CustomHandler
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"서버가 포트 {PORT}에서 실행 중입니다...")
    print(f"인터넷 브라우저 주소창에 http://localhost:{PORT} 를 입력하세요.")
    httpd.serve_forever()
