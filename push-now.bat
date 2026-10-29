@echo off
cd /d "%~dp0"
echo ========================================================
echo   OneAmple / iBrainLabs - Git Push to GitHub
echo ========================================================
echo.
echo Pushing 9 commits to origin/main...
echo (If a browser window or login prompt pops up, click "Sign in with your browser")
echo.
git push origin main
echo.
echo ========================================================
echo   Push complete! Press any key to close this window.
echo ========================================================
pause

