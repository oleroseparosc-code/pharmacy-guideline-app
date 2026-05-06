import http.server
import socketserver
import json
import os
import urllib.parse
import urllib.request
import uuid
from email.message import EmailMessage
from email.parser import BytesParser
import subprocess
import time

PORT = 8000
DIRECTORY = r"c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱"
PUBLIC_DATA_URL = "https://oleroseparosc-code.github.io/pharmacy-guideline-app/data.js"

def read_local_data_js():
    data_js_path = os.path.join(DIRECTORY, 'data.js')
    with open(data_js_path, 'r', encoding='utf-8') as f:
        return f.read()

def normalize_data_js(content):
    return content.replace('\r\n', '\n').strip()

def wait_for_public_data_sync(timeout_seconds=180, interval_seconds=5):
    local_data = normalize_data_js(read_local_data_js())
    deadline = time.time() + timeout_seconds
    last_error = None

    while time.time() < deadline:
        try:
            url = f"{PUBLIC_DATA_URL}?v={int(time.time() * 1000)}"
            request = urllib.request.Request(url, headers={'Cache-Control': 'no-cache'})
            with urllib.request.urlopen(request, timeout=15) as response:
                remote_data = normalize_data_js(response.read().decode('utf-8'))

            if remote_data == local_data:
                return True, None
            last_error = "공개 링크의 data.js가 아직 최신 파일로 바뀌지 않았습니다."
        except Exception as e:
            last_error = str(e)

        time.sleep(interval_seconds)

    return False, last_error

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

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

        elif self.path == '/api/deploy':
            try:
                # Git 명령어 실행하여 변경사항 배포
                subprocess.run(['git', 'add', '.'], cwd=DIRECTORY, check=True)
                
                # 변경사항이 있는지 확인
                status_result = subprocess.run(['git', 'status', '--porcelain'], cwd=DIRECTORY, capture_output=True, text=True)
                
                if status_result.stdout.strip():
                    subprocess.run(['git', 'commit', '-m', '웹 에디터에서 내용 수정 및 업데이트'], cwd=DIRECTORY, check=True)
                    subprocess.run(['git', 'push', 'origin', 'main'], cwd=DIRECTORY, check=True)
                    synced, sync_error = wait_for_public_data_sync()
                    if synced:
                        message = "변경사항이 실제 링크(웹)에 반영된 것을 확인했습니다. 새로고침하면 최신 내용이 보입니다."
                    else:
                        self.send_response(504)
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            'status': 'error',
                            'message': f'GitHub 업로드는 완료됐지만 실제 링크 반영 확인이 아직 안 됐습니다. 잠시 후 다시 저장하거나 새로고침해 주세요. ({sync_error})'
                        }, ensure_ascii=False).encode('utf-8'))
                        return
                else:
                    synced, sync_error = wait_for_public_data_sync(timeout_seconds=60)
                    if synced:
                        message = "수정된 내용은 이미 실제 링크(웹)에 반영되어 있습니다."
                    else:
                        self.send_response(504)
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            'status': 'error',
                            'message': f'수정된 로컬 내용과 실제 링크 내용이 아직 다릅니다. 다시 저장해 주세요. ({sync_error})'
                        }, ensure_ascii=False).encode('utf-8'))
                        return

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success', 'message': message}, ensure_ascii=False).encode('utf-8'))
                return
            except subprocess.CalledProcessError as e:
                print("Git error:", e)
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': f'배포 중 오류가 발생했습니다: {str(e)}'}).encode('utf-8'))
                return
            except Exception as e:
                print("Deploy error:", e)
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
