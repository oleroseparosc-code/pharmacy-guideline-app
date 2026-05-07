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
TRACKED_OUTPUTS = [
    "data.js",
    "custom_edits.json",
    "dist/index.html",
    "dist/app.js",
    "dist/data.js",
    "dist/style.css",
    "dist/images",
    "images",
]

def log(message):
    with open(os.path.join(WORK_DIR, "auto_sync.log"), "a", encoding="utf-8") as f:
        f.write(f"{time.ctime()}: {message}\n")

def run_step(args, cwd=APP_DIR):
    subprocess.run(args, cwd=cwd, check=True)

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
            log("PDF/data auto update started")

            # 1. extract_with_images.py 실행
            run_step(["python", os.path.join(APP_DIR, "extract_with_images.py")])
            
            # 2. fix_images2.py 실행
            run_step(["python", os.path.join(APP_DIR, "fix_images2.py")])

            # 3. dist 생성
            run_step(["python", os.path.join(APP_DIR, "build_dist.py")])
            
            # 4. 필요한 산출물만 Git에 추가
            run_step([GIT_EXE, "add", *TRACKED_OUTPUTS])
            
            status = subprocess.run(
                [GIT_EXE, "status", "--porcelain"],
                cwd=APP_DIR,
                check=True,
                capture_output=True,
                text=True
            )
            if not status.stdout.strip():
                log("No changes to commit")
                return

            # 5. git commit
            run_step([GIT_EXE, "commit", "-m", "데이터 자동 업데이트"])
            
            # 6. git push
            run_step([GIT_EXE, "push", "origin", "main"])
            log("PDF/data auto update pushed to origin main")
            
        except Exception as e:
            # 백그라운드이므로 에러 로그를 남기거나 무시
            with open(os.path.join(WORK_DIR, "auto_sync_error.log"), "a", encoding="utf-8") as f:
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
