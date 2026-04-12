@echo off
setlocal

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Could not find .venv\Scripts\python.exe
  echo Create it first with: python -m venv .venv
  exit /b 1
)

echo Starting backend at http://127.0.0.1:8000
echo API docs: http://127.0.0.1:8000/docs
".venv\Scripts\python.exe" -m uvicorn app.main:app --reload --reload-dir backend --app-dir backend
