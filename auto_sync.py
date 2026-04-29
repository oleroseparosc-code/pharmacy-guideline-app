import os
import time
import subprocess
from threading import Timer
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# 설정
WATCH_DIR = r"c:\Users\duih\Desktop\코딩\규정 지침 앱"
WORK_DIR = r"c:\Users\duih\Desktop\코딩"
APP_DIR = r"c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱"
GIT_EXE = r"C:\Program Files\Git\cmd\git.exe"

class WatcherHandler(FileSystemEventHandler):
    def __init__(self):
        self.timer = None
        self.debounce_seconds = 10

    def on_any_event(self, event):
        if event.is_directory:
            return
        if not event.src_path.lower().endswith('.pdf'):
            return

        # pdf 파일에 변화가 감지되면 타이머(10초)를 시작 (중복 방지)
        if self.timer:
            self.timer.cancel()
        self.timer = Timer(self.debounce_seconds, self.run_sync)
        self.timer.start()

    def run_sync(self):
        # 윈도우에서 콘솔 창이 뜨지 않게 설정
        creationflags = 0
        if os.name == 'nt':
            creationflags = subprocess.CREATE_NO_WINDOW

        try:
            # 1. extract_with_images.py 실행
            subprocess.run(["python", os.path.join(APP_DIR, "extract_with_images.py")], 
                           cwd=APP_DIR, creationflags=creationflags)
            
            # 2. fix_images2.py 실행
            subprocess.run(["python", os.path.join(APP_DIR, "fix_images2.py")], 
                           cwd=APP_DIR, creationflags=creationflags)
            
            # 3. git add .
            subprocess.run([GIT_EXE, "add", "."], 
                           cwd=APP_DIR, creationflags=creationflags)
            
            # 4. git commit
            subprocess.run([GIT_EXE, "commit", "-m", "Auto sync from background watcher"], 
                           cwd=APP_DIR, creationflags=creationflags)
            
            # 5. git push
            subprocess.run([GIT_EXE, "push", "origin", "main"], 
                           cwd=APP_DIR, creationflags=creationflags)
            
        except Exception as e:
            # 백그라운드이므로 에러 로그를 남기거나 무시
            with open(os.path.join(WORK_DIR, "auto_sync_error.log"), "a") as f:
                f.write(f"{time.ctime()}: {str(e)}\n")

if __name__ == "__main__":
    event_handler = WatcherHandler()
    observer = Observer()
    observer.schedule(event_handler, WATCH_DIR, recursive=False)
    observer.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
