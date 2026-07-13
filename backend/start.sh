#!/usr/bin/env bash
pip install -r backend/requirements.txt
uvicorn app:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8080}
