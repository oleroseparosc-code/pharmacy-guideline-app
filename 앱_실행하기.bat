@echo off
chcp 65001 > nul
title Pharmacy Guideline Editor Server

cd /d "%~dp0"

echo ========================================================
echo Pharmacy guideline editor server
echo ========================================================
echo Opening http://localhost:8000 ...
start "" "http://localhost:8000"
echo.
echo Keep this window open while editing documents.
echo Close this window to stop the editor server.
echo.

python server.py
pause
