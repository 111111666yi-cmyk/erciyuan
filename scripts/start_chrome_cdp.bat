@echo off
set DBG=%LOCALAPPDATA%\ChromeDebugTG
if not exist "%DBG%" mkdir "%DBG%"
"C:\Users\23775\AppData\Local\Google\Chrome SxS\Application\chrome.exe" --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --user-data-dir="%DBG%" --new-window "https://web.telegram.org/k/#@gongzhutonghao"
