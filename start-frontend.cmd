@echo off
setlocal

cd /d "%~dp0frontend"

if not exist "node_modules" (
  echo Could not find frontend\node_modules
  echo Install frontend dependencies first with: cd frontend
  echo Then run: npm install
  exit /b 1
)

echo Starting frontend at http://127.0.0.1:5173
cmd /c npm.cmd run dev
