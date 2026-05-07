@echo off
chcp 65001 > nul
title Pharmacy Guideline Manual Update

cd /d "%~dp0"

echo ========================================================
echo Pharmacy guideline manual update
echo ========================================================
echo This publishes edits saved from the local document editor.
echo.

echo [1/4] Building dist...
python build_dist.py
if errorlevel 1 goto error

echo.
echo [2/4] Preparing Git changes...
git add data.js custom_edits.json dist/index.html dist/app.js dist/data.js dist/style.css dist/images images
if errorlevel 1 goto error

git status --porcelain > "%TEMP%\pharmacy_guideline_git_status.txt"
for %%A in ("%TEMP%\pharmacy_guideline_git_status.txt") do if %%~zA==0 goto nochange

echo.
echo [3/4] Committing changes...
git commit -m "문서 편집기 수동 업데이트"
if errorlevel 1 goto error

echo.
echo [4/4] Pushing to GitHub main...
git push origin main
if errorlevel 1 goto error

echo.
echo ========================================================
echo Manual update pushed to GitHub main.
echo Check Cloudflare build status, then open the public app.
echo https://pharmacy-guideline-app.olerose-parosc.workers.dev/
echo ========================================================
pause
exit /b 0

:nochange
echo.
echo No changes to publish.
del "%TEMP%\pharmacy_guideline_git_status.txt" > nul 2>&1
pause
exit /b 0

:error
echo.
echo ========================================================
echo Manual update failed. Check the message above.
echo ========================================================
pause
exit /b 1
