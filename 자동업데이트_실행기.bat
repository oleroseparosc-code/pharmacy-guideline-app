@echo off
chcp 65001 > nul
title Pharmacy Guideline Data Auto Update

cd /d "%~dp0"

echo ========================================================
echo Pharmacy guideline data auto update watcher
echo ========================================================
echo Watching PDF/data folder for changes.
echo Source folder:
echo C:\Users\duih\Desktop\코딩\규정 지침 앱
echo.
echo When PDF data changes, this watcher regenerates data.js,
echo builds dist, commits, and pushes origin main.
echo.
echo Keep this window open while you want automatic updates.
echo Close this window to stop watching.
echo ========================================================
echo.

python auto_sync.py
pause
