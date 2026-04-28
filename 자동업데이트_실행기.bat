@echo off
echo ========================================================
echo 약제팀 규정 및 업무 지침 - 자동 업데이트 실행기
echo ========================================================
echo [1/4] PDF 변환 중... (1-3분 대기)
cd /d "c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱"
python "c:\Users\duih\Desktop\코딩\extract_with_images.py"

echo.
echo [2/4] 이미지 수정 중...
python "c:\Users\duih\Desktop\코딩\fix_images2.py"

echo.
echo [3/4] Git 업로드 준비...
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Auto update via Magic Button"

echo.
echo [4/4] GitHub로 업로드 중...
"C:\Program Files\Git\cmd\git.exe" push origin main

echo.
echo ========================================================
echo 완료되었습니다! 인터넷 창을 확인하세요.
echo ========================================================
pause >nul
