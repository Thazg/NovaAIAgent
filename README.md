# Nova AI Agent

A **Retrieval-Augmented Generation (RAG)** chatbot that lets users chat with their documents — PDF, DOCX, Markdown, code files. Built with FastAPI + React, deployed free on cloud (Render + Vercel), with persistent storage via Backblaze B2.

---

## Highlights

- **TF-IDF + Query Expansion** — sparse retrieval over document chunks with automatic acronym expansion (e.g., "RAG" → "retrieval augmented generation")
- **Real-time streaming** — SSE-based token output from Groq LLM (free tier, no GPU needed)
- **Web PDF search** — users say "search for topic", system downloads & indexes relevant PDFs from DuckDuckGo
- **Backblaze B2 persistence** — vector index, conversations, and uploads survive Render's free-tier sleep cycles
- **UploadGate flow** — first-time users upload a document before entering the chat screen
- **Multi-language** — auto-detect or manually override (English / Vietnamese)
- **Dark / Light / System theme** — no FOUC; inline script reads localStorage before React mounts

## Architecture

```
Frontend (Vite + React + shadcn/ui) ──SSE──▶ Backend (FastAPI) ──▶ Groq API
                                                   │
                                              TF-IDF Vector Store
                                                   │
                                           Backblaze B2 (cloud sync)
```

- **Frontend**: React 18, TypeScript, Zustand (persisted to localStorage), Tailwind CSS, shadcn/ui
- **Backend**: Python 3.12, FastAPI, scikit-learn TF-IDF, custom chunking & retrieval pipeline
- **LLM**: Groq API (`llama-3.1-8b-instant`, free, 128K context)
- **Storage**: Local files + optional Backblaze B2 sync for persistence
- **Deploy**: `render.yaml` (backend), Vercel (frontend), Docker Compose for local dev

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| TF-IDF over embeddings | Zero cold-start cost on free Render; 30-50ms retrieval; no GPU dependency |
| Backblaze B2 over Supabase/R2 | 10 GB free, no credit card required |
| Groq over local Ollama | Free tier, 128K context, no GPU needed in production |
| Query expansion | Solves TF-IDF's inability to handle synonyms/acronyms without switching to embeddings |
| UploadGate | Ensures users have indexed content before chatting, reducing confusing empty-state experiences |

## What I Built

- Custom **TF-IDF vector store** with cosine similarity retrieval, query expansion, and term-aware re-ranking
- **Document processing pipeline**: PDF (PyPDF), DOCX, Markdown, Python, Jupyter notebooks → chunked → indexed
- **Conversation store** with session history persistence + B2 cloud sync
- **Streaming SSE protocol** between frontend and backend for real-time token output
- **Web PDF search** using DuckDuckGo scraping with multiple fallback HTML parsers
- **Theme system** that reads persisted preference before React hydration (no flash)

## Structure

```
backend/
├── api/routes/        # FastAPI endpoints (chat, documents, sessions)
├── rag/               # TF-IDF vector store, chunking, prompts, LLM client
├── config/            # Environment-based settings
├── services/          # Conversation store, B2 remote storage
└── app.py

frontend/
├── src/components/    # Chat, layout, sidebar, UI components
├── src/store/         # Zustand state (theme, conversations, settings)
├── src/services/      # API client (SSE consumption)
└── src/types/
```

## Live Demo

- `https://nova-ai-agent.vercel.app`
- Tech: FastAPI · React · TypeScript · scikit-learn · Groq · Backblaze B2 · Docker

## License

MIT
