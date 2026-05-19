@echo off
echo ================================
echo Pandora safe Cloudflare deploy
echo ================================
echo.

echo Current Git status:
git status --short

echo.
echo WARNING:
echo This script will deploy current folder to Cloudflare Pages.
echo It will NOT commit.
echo It will NOT push.
echo It will NOT force push.
echo.

set /p CONFIRM=Type DEPLOY to continue: 

if /I not "%CONFIRM%"=="DEPLOY" (
    echo Deploy cancelled.
    pause
    exit /b 1
)

wrangler pages deploy . --project-name=pandora

pause
