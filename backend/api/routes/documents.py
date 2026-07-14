import json
import logging
import os
import re
import shutil
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from config.settings import settings
from rag.chunking import split_documents
from rag.load import BACKEND_DIR, DATASET_DIR, load_documents, load_file
from rag.llm_client import stream_tokens
from rag.rag_chain import get_retriever, reload_vector_store
from rag.vector_store import METADATA_FILE, build_vector_store, load_vector_store

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOADS_DIR = Path(settings.UPLOAD_FOLDER).resolve()
LEGACY_UPLOADS_DIR = (BACKEND_DIR / "uploads").resolve()
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
SOURCE_URLS_FILE = UPLOADS_DIR / "source_urls.json"


def _load_source_urls() -> dict[str, str]:
    if SOURCE_URLS_FILE.exists():
        try:
            with SOURCE_URLS_FILE.open("r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, Exception):
            pass
    return {}


def _save_source_urls(mapping: dict[str, str]) -> None:
    with SOURCE_URLS_FILE.open("w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
    try:
        from services.remote_storage import upload_file
        upload_file("uploads/source_urls.json", SOURCE_URLS_FILE)
    except Exception:
        pass


def _delete_remote_file(filename: str) -> None:
    try:
        from services.remote_storage import delete_file
        delete_file(f"uploads/{filename}")
    except Exception:
        pass


@router.post("/summarize")
async def summarize_document(request: dict):
    filename = request.get("filename", "")
    if not filename:
        raise HTTPException(status_code=400, detail="filename required")

    try:
        store = load_vector_store()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Vector store not found")

    filename_lower = filename.lower()
    chunks = [
        doc.get("content", "")
        for doc in store.documents
        if doc.get("metadata", {}).get("file_name", "").lower() == filename_lower
    ]

    if not chunks:
        raise HTTPException(status_code=404, detail="No chunks found for this file")

    full_text = "\n\n".join(chunks)
    max_chars = 20000
    truncated = len(full_text) > max_chars
    if truncated:
        full_text = full_text[:max_chars] + "\n\n[... content truncated ...]"

    prompt = (
        f"You are a research assistant. Summarize the document below thoroughly but concisely.\n"
        f"Structure your response into these sections:\n"
        f"## Overview\n"
        f"A brief description of what this document covers.\n\n"
        f"## Key Points\n"
        f"Bullet list of the main ideas, findings, or arguments.\n\n"
        f"## Key Terms & Definitions\n"
        f"Important terminology introduced in the document.\n\n"
        f"## Conclusion\n"
        f"The main takeaway or final message.\n\n"
        f"Respond in the same language as the document.{' Note: the document was too long and was truncated.' if truncated else ''}\n\n"
        f"Document:\n{full_text}\n\n"
        f"Summary:"
    )

    summary = ""
    async for token in stream_tokens(prompt):
        summary += token
    return {"summary": summary, "chunks": len(chunks), "filename": filename}


def _load_chunk_counts() -> dict[str, int]:
    chunk_counts: dict[str, int] = {}
    if not METADATA_FILE.exists():
        return chunk_counts

    with METADATA_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                item = json.loads(line)
                source = item.get("metadata", {}).get("file_name") or item.get("metadata", {}).get("source")
                if source:
                    chunk_counts[source] = chunk_counts.get(source, 0) + 1
            except json.JSONDecodeError:
                continue
    return chunk_counts


def _list_upload_files() -> list[dict]:
    chunk_counts = _load_chunk_counts()
    source_urls = _load_source_urls()
    files = []

    if not UPLOADS_DIR.exists() or not any(UPLOADS_DIR.iterdir()):
        try:
            from services.remote_storage import list_files
            remote_files = list_files("uploads/")
            for remote_path in remote_files:
                name = remote_path[len("uploads/"):]
                if name == "source_urls.json":
                    continue
                files.append({
                    "id": name,
                    "name": name,
                    "size": 0,
                    "indexed": bool(chunk_counts.get(name)),
                    "chunks": chunk_counts.get(name, 0),
                    "source_url": source_urls.get(name),
                })
            return files
        except ImportError:
            pass

    search_dirs = [UPLOADS_DIR]
    if LEGACY_UPLOADS_DIR.exists() and LEGACY_UPLOADS_DIR != UPLOADS_DIR:
        search_dirs.append(LEGACY_UPLOADS_DIR)

    seen_names: set[str] = set()
    for folder in search_dirs:
        if not folder.exists():
            continue
        for file_path in sorted(folder.iterdir()):
            if not file_path.is_file():
                continue
            if file_path.name in seen_names or file_path.name == "source_urls.json":
                continue
            seen_names.add(file_path.name)
            files.append({
                "id": file_path.name,
                "name": file_path.name,
                "size": file_path.stat().st_size,
                "indexed": bool(chunk_counts.get(file_path.name)),
                "chunks": chunk_counts.get(file_path.name, 0),
                "source_url": source_urls.get(file_path.name),
            })
    return files


def _index_uploaded_file(file_path: Path) -> tuple[bool, int, str]:
    documents = load_file(file_path)
    if not documents:
        return False, 0, "File type not supported"

    nodes = split_documents(documents)
    if not nodes:
        return False, 0, "No content extracted from file"

    try:
        store = get_retriever()
        if store is None:
            raise FileNotFoundError("No retriever available")
    except (FileNotFoundError, AttributeError):
        try:
            store = load_vector_store()
        except FileNotFoundError:
            build_vector_store(nodes)
            reload_vector_store()
            return True, len(nodes), "Indexed successfully"

    store.remove_by_file_name(file_path.name)
    store.add_nodes(nodes)
    store.persist()
    reload_vector_store()
    return True, len(nodes), "Indexed successfully"


def _rebuild_full_index() -> tuple[int, int]:
    documents = load_documents(DATASET_DIR)
    nodes = split_documents(documents)
    build_vector_store(nodes)
    reload_vector_store()
    return len(documents), len(nodes)


@router.get("")
def list_documents():
    return _list_upload_files()


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_location = UPLOADS_DIR / file.filename
    with file_location.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    uploaded_to_b2 = False
    try:
        from services.remote_storage import upload_file, delete_file
        uploaded_to_b2 = upload_file(f"uploads/{file.filename}", file_location)
    except ImportError:
        pass

    try:
        indexed, chunk_count, message = _index_uploaded_file(file_location)
        try:
            dataset_path = str(file_location.relative_to(DATASET_DIR))
        except ValueError:
            dataset_path = str(file_location)

        return {
            "status": "success",
            "filename": file.filename,
            "indexed": indexed,
            "chunks": chunk_count,
            "message": message,
            "dataset_path": dataset_path,
        }
    except Exception as exc:
        if uploaded_to_b2:
            try:
                delete_file(f"uploads/{file.filename}")
            except ImportError:
                pass
        if file_location.exists():
            file_location.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload and index document: {exc}") from exc


@router.delete("/clear-all")
def clear_all_documents():
    deleted_count = 0
    for folder in {UPLOADS_DIR, LEGACY_UPLOADS_DIR}:
        if not folder.exists():
            continue
        for file_path in folder.iterdir():
            if file_path.is_file():
                file_path.unlink()
                deleted_count += 1

    try:
        from services.remote_storage import list_files, delete_file
        remote_files = list_files("uploads/")
        for remote_path in remote_files:
            if remote_path != "uploads/source_urls.json":
                delete_file(remote_path)
    except Exception:
        pass

    _save_source_urls({})
    _rebuild_full_index()

    return {"status": "success", "deleted": deleted_count}


@router.delete("/{id}")
def delete_document(id: str):
    deleted = False
    for folder in {UPLOADS_DIR, LEGACY_UPLOADS_DIR}:
        file_location = folder / id
        if file_location.exists():
            file_location.unlink()
            deleted = True

    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    _delete_remote_file(id)

    source_urls = _load_source_urls()
    source_urls.pop(id, None)
    _save_source_urls(source_urls)

    try:
        store = get_retriever()
        store.remove_by_file_name(id)
        store.persist()
        reload_vector_store()
    except FileNotFoundError:
        _rebuild_full_index()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Document deleted but reindex failed: {exc}") from exc

    return {"status": "success"}


@router.post("/reindex")
def reindex_documents():
    try:
        doc_count, chunk_count = _rebuild_full_index()
        return {
            "status": "success",
            "message": "Reindexing completed",
            "documents": doc_count,
            "chunks": chunk_count,
        }
    except Exception as exc:
        return {"status": "error", "message": str(exc)}


class SearchRequest(BaseModel):
    query: str
    max_results: int = 3


@router.post("/search-download")
def search_and_download(req: SearchRequest):
    try:
        from rag.downloader import (
            download_pdf,
            safe_pdf_filename,
            search_pdf_urls,
        )

        clean_query = re.sub(r'^(?:search|tìm)\s+(?:for|kiếm)?\s*', '', req.query, flags=re.IGNORECASE).strip()
        if not clean_query:
            clean_query = req.query
        search_query = f'{clean_query} filetype:pdf'

        urls = search_pdf_urls(search_query, max_results=req.max_results)
        if not urls:
            urls = search_pdf_urls(clean_query, max_results=req.max_results)
        if not urls:
            return {"status": "success", "downloaded": [], "message": "No PDFs found for query."}

        source_urls = _load_source_urls()
        downloaded = []
        for url in urls:
            file_name = safe_pdf_filename(url)
            file_path = UPLOADS_DIR / file_name
            if file_path.exists():
                downloaded.append({"file_name": file_name, "new": False})
                source_urls.setdefault(file_name, url)
                continue
            try:
                download_pdf(url, file_path)
                downloaded.append({"file_name": file_name, "new": True})
                source_urls[file_name] = url
            except Exception as exc:
                logger.warning("Failed to download %s: %s", url, exc)

        if downloaded:
            _save_source_urls(source_urls)
            _rebuild_full_index()

        return {
            "status": "success",
            "downloaded": downloaded,
            "message": f"Downloaded {sum(1 for d in downloaded if d['new'])} new files.",
        }
    except Exception as exc:
        logger.error("Search-and-download error: %s", exc)
        return {"status": "error", "message": str(exc)}
