@echo off
echo Starting Nova AI Agent Backend...
cd backend
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
pause
