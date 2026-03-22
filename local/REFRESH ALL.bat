@echo off
echo [1/3] RUNNING PYTHON AUTO SCREENSHOT...
python 1_website_capture_finalized.py

echo [2/3] WAITING...
timeout /t 1 /nobreak >nul

echo [3/3] REFRESHING KINDLE...
call 2_push_to_kindle.bat

echo SUCCESSED!