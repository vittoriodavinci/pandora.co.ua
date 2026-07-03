@echo off
chcp 65001 >nul
setlocal

REM Pandora production deploy:
REM 1) commit changes to Git
REM 2) push master to GitHub
REM 3) deploy current folder directly to Cloudflare Pages via Wrangler

cd /d "%~dp0"

echo.
echo ================================
echo   PANDORA DEPLOY
echo ================================
echo Folder: %CD%
echo.

REM Check git repository
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: This folder is not a Git repository.
  goto fail
)

REM Check branch
for /f "delims=" %%b in ('git branch --show-current') do set "BRANCH=%%b"
echo Current branch: %BRANCH%

if /I not "%BRANCH%"=="master" (
  echo ERROR: Production branch must be master.
  echo Switch to master first, then run this deploy again.
  goto fail
)

echo.
echo [1/5] Git status
git status --short

echo.
echo [2/5] Stage files
git add .
if errorlevel 1 goto fail

REM Commit only if there are staged changes
git diff --cached --quiet
if errorlevel 1 (
  echo.
  echo [3/5] Commit changes
  git commit -m "update"
  if errorlevel 1 goto fail
) else (
  echo.
  echo [3/5] No file changes to commit
)

echo.
echo [4/5] Push to GitHub master
git push origin master
if errorlevel 1 goto fail

echo.
echo [5/5] Cloudflare Pages deploy via Wrangler
call npx wrangler pages deploy . --project-name=pandora --branch=master
if errorlevel 1 goto fail

echo.
echo ================================
echo   DEPLOY COMPLETE
echo ================================
echo Check:
echo https://pandora.co.ua/requisites.html?x=test
echo.
pause
exit /b 0

:fail
echo.
echo ================================
echo   DEPLOY FAILED
echo ================================
echo Copy the console output and send it to ChatGPT.
echo.
pause
exit /b 1
