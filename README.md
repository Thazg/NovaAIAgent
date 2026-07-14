# Nova AI Agent

A production-grade **Retrieval-Augmented Generation (RAG)** chatbot with document upload, web PDF search, real-time streaming, voice input, and multi-language support. Works **100% free on cloud** — no credit card needed.

![Tech Stack](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Tech Stack](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Tech Stack](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tech Stack](https://img.shields.io/badge/Groq-FF6600?logo=groq&logoColor=white)
![Tech Stack](https://img.shields.io/badge/Zustand-764ABC?logo=zustand&logoColor=white)
![Tech Stack](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

---

## Features

- **RAG Chat** — Ask questions over uploaded documents; TF-IDF retrieval + LLM generation with source citations
- **Document Upload** — Upload PDF, DOCX, Markdown, TXT, Python files — auto-indexed
- **Web PDF Search** — Say "search for <topic>" to download and index PDFs from the web
- **Summarize** — One-click document summarization with structured output (Overview / Key Points / Conclusion)
- **UploadGate** — First-time users must upload at least one document before chatting
- **Real-time Streaming** — SSE-based token streaming for instant responses
- **Voice Input** — Speech-to-text via Web Speech API (Vietnamese & English)
- **Multi-language** — Auto-detect language; override via Settings (Auto / English / Vietnamese)
- **Personalization** — Character style, nickname, custom instructions
- **Dark/Light/System** — Theme-aware with localStorage persistence, no flash
- **Session History** — Persistent conversation history across sessions
- **Backblaze B2** — Cloud persistence for vector index, conversations, and uploaded documents
- **Dockerized** — One-command local setup with docker-compose

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  React App  │────▶│  FastAPI     │────▶│  Groq API   │
│  (Vite+SHA  │     │  Backend     │     │  (Free LLM) │
│  shadcn/ui) │◀────│  (REST+SSE)  │     └─────────────┘
└─────────────┘     │              │
                    │  TF-IDF      │
                    │  Vector Store│
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐     ┌──────────────┐
                    │  Documents   │────▶│  Backblaze   │
                    │  (PDF/MD/    │     │  B2 (Cloud)  │
                    │   TXT/DOCX)  │     └──────────────┘
                    └──────────────┘
```

### Backend (FastAPI)
- **RAG Pipeline**: TF-IDF vectorization → cosine similarity retrieval → prompt assembly → LLM generation
- **LLM**: Groq API (free, no GPU) — also supports local Ollama
- **Document Processing**: PyPDF, python-docx, markdown parsing with chunking
- **Streaming**: Server-Sent Events (SSE) for real-time token output
- **Storage**: Local TF-IDF index + Backblaze B2 sync for persistence across restarts
- **Conversations**: JSON-based session store, synced to B2

### Frontend (React)
- **UI Library**: shadcn/ui + Tailwind CSS + Framer Motion
- **State Management**: Zustand with localStorage persistence
- **Streaming**: SSE consumption with real-time token rendering
- **UploadGate**: Full-screen upload prompt before main chat
- **Voice**: Web Speech API for microphone input

## Quick Start (Local)

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Python](https://www.python.org/) 3.10+
- A free [Groq API key](https://console.groq.com)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/nova-ai-agent.git
cd nova-ai-agent

# Backend
cd backend && pip install -r requirements.txt && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Set up environment

Create `backend/.env`:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

### 3. Start Backend

```bash
cd backend
uvicorn app:app --reload --port 8000
```

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Docker (Alternative)

```bash
docker compose up --build
```

Frontend: [http://localhost:3000](http://localhost:3000) · Backend: [http://localhost:8000](http://localhost:8000)

## Deploy to Cloud (100% Free)

### 1. Backend → Render

1. Push your repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New Web Service**
3. Connect your GitHub repo (root directory)
4. Render auto-detects `render.yaml` — or manually set:
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     - `LLM_PROVIDER` → `groq`
     - `GROQ_API_KEY` → your key
     - `GROQ_MODEL` → `llama-3.1-8b-instant`
     - `PYTHONPATH` → `/app`
     - `B2_KEY_ID` → your Backblaze B2 key ID
     - `B2_APP_KEY` → your Backblaze B2 app key
5. Deploy (free tier — sleeps after inactivity, ~30s cold start)

### 2. Frontend → Vercel

1. Go to [Vercel Dashboard](https://vercel.com) → **Import Repository**
2. Select your GitHub repo, root: `frontend/`
3. Add env variable: `VITE_API_BASE_URL=https://your-backend.onrender.com`
4. Deploy (Vercel auto-detects Vite, free tier)

> Your app is now live! When the Render backend sleeps, the first request may take ~30s to wake up.

### 3. Backblaze B2 (Optional)

Create a free B2 bucket and add `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET`, `B2_ENDPOINT` to your Render environment. Data persists across restarts.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| State | Zustand + localStorage persistence |
| Backend | Python 3.12, FastAPI, Uvicorn |
| Retrieval | TF-IDF (scikit-learn), cosine similarity |
| LLM | Groq API (free) or local Ollama |
| Documents | PyPDF, python-docx, markdown |
| Cloud Storage | Backblaze B2 (S3-compatible) |
| Streaming | Server-Sent Events (SSE) |
| Voice | Web Speech API |
| Container | Docker, Docker Compose |

## Project Structure

```
nova-ai-agent/
├── backend/
│   ├── api/routes/           # FastAPI endpoints
│   ├── rag/                  # RAG pipeline (vector store, prompts, LLM client)
│   ├── config/               # Settings & environment
│   ├── services/             # Session storage & Backblaze B2 sync
│   ├── Dataset/              # Document corpus & uploads
│   ├── storage/              # Persisted vector index
│   ├── app.py                # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/       # React components (chat, layout, sidebar)
│   │   ├── store/            # Zustand state management
│   │   ├── services/         # API client
│   │   └── types/            # TypeScript types
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── render.yaml
└── README.md
```

## License

MIT
