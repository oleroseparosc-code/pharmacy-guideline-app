@echo off
chcp 65001 > nul
echo ========================================================
echo 약제팀 규정 지침 앱 - 로컬 서버 실행기
echo ========================================================
echo 브라우저에서 앱을 엽니다...
start http://localhost:8000

echo 서버를 시작합니다. 이 창을 끄면 앱의 저장 기능이 작동하지 않습니다.
cd /d "c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱"
python server.py
pause
