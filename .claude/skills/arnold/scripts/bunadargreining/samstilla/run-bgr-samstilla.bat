@echo off
rem Keyrir bgr_samstilla.cjs --skrifa (Scheduled Task SlokkvitaekiBgrSamstilla, á 10 mín fresti). Skrá: %LOCALAPPDATA%\slokkvitaeki-bgr\keyrsla.log
if not exist "%LOCALAPPDATA%\slokkvitaeki-bgr" mkdir "%LOCALAPPDATA%\slokkvitaeki-bgr"
node "%~dp0bgr_samstilla.cjs" --skrifa >> "%LOCALAPPDATA%\slokkvitaeki-bgr\keyrsla.log" 2>&1
