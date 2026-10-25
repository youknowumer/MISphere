@echo off
REM Opens MISphere in its own app window (no browser tabs) using Edge or Chrome. No install needed.
setlocal
set "HERE=%~dp0"
set "URL=file:///%HERE:\=/%index.html"
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%EDGE%" ( start "" "%EDGE%" --app="%URL%" --window-size=1360,880 & exit /b )
if exist "%CHROME%" ( start "" "%CHROME%" --app="%URL%" --window-size=1360,880 & exit /b )
start "" "%URL%"
