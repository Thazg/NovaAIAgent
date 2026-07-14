import json
import os
import pickle
import re
from pathlib import Path
from typing import Any, Dict, List

from scipy.sparse import vstack as sparse_vstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

BACKEND_DIR = Path(__file__).resolve().parents[1]
INDEX_DIR = Path(os.getenv("VECTOR_STORE_DIR", BACKEND_DIR / "storage" / "index")).resolve()
INDEX_DIR.mkdir(parents=True, exist_ok=True)
VECTORIZER_FILE = INDEX_DIR / "vectorizer.pkl"
METADATA_FILE = INDEX_DIR / "metadata.jsonl"

B2_VECTORIZER_PATH = "index/vectorizer.pkl"
B2_METADATA_PATH = "index/metadata.jsonl"


ACRONYM_MAP = {
    "rag": "retrieval augmented generation",
    "qa": "question answering",
    "nlp": "natural language processing",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "nn": "neural network",
    "cnn": "convolutional neural network",
    "rnn": "recurrent neural network",
    "lstm": "long short term memory",
    "gpt": "generative pre trained transformer",
    "bert": "bidirectional encoder representations from transformers",
    "tf": "tensorflow",
    "svm": "support vector machine",
    "pca": "principal component analysis",
    "ir": "information retrieval",
    "ner": "named entity recognition",
    "pos": "part of speech",
    "tfidf": "term frequency inverse document frequency",
    "llm": "large language model",
    "sota": "state of the art",
    "db": "database",
    "ui": "user interface",
    "api": "application programming interface",
    "sse": "server sent events",
}

def expand_query(query: str) -> str:
    words = re.findall(r"[a-zA-Z]\w*", query)
    expanded = set(words)
    for w in words:
        wl = w.lower()
        if wl in ACRONYM_MAP:
            expanded.update(ACRONYM_MAP[wl].split())
    if len(expanded) > len(words):
        return query + " " + " ".join(sorted(expanded - set(w.lower() for w in words)))
    return query


class TfidfVectorStore:
    def __init__(self, vectorizer: TfidfVectorizer = None, documents: List[Dict[str, Any]] = None):
        self.vectorizer = vectorizer or TfidfVectorizer(stop_words="english", max_df=0.9, ngram_range=(1, 2))
        self.documents = documents or []
        self.document_matrix = None

        if self.documents:
            self._build_matrix()

    def _build_matrix(self) -> None:
        documents = [doc.get("content", "") for doc in self.documents]
        self.document_matrix = self.vectorizer.fit_transform(documents)

    def add_nodes(self, nodes: List[Dict[str, Any]]) -> int:
        if not nodes:
            return 0

        new_texts = [node.get("content", "") for node in nodes]

        if self.document_matrix is not None and self.vectorizer.vocabulary_:
            new_vectors = self.vectorizer.transform(new_texts)
            self.document_matrix = sparse_vstack([self.document_matrix, new_vectors])
        else:
            self.documents.extend(nodes)
            self._build_matrix()
            return len(nodes)

        self.documents.extend(nodes)
        return len(nodes)

    def remove_by_file_name(self, file_name: str) -> int:
        if not file_name or not self.documents:
            return 0

        before = len(self.documents)
        mask = [
            doc.get("metadata", {}).get("file_name") != file_name
            for doc in self.documents
        ]
        self.documents = [d for d, m in zip(self.documents, mask) if m]
        removed = before - len(self.documents)

        if removed and self.document_matrix is not None:
            self.document_matrix = self.document_matrix[mask]

        if not self.documents:
            self.document_matrix = None

        return removed

    def persist(self) -> None:
        with VECTORIZER_FILE.open("wb") as f:
            pickle.dump(self.vectorizer, f)

        with METADATA_FILE.open("w", encoding="utf-8") as f:
            for node in self.documents:
                json.dump(node, f, ensure_ascii=False)
                f.write("\n")

        try:
            from services.remote_storage import upload_file
            upload_file(B2_VECTORIZER_PATH, VECTORIZER_FILE)
            upload_file(B2_METADATA_PATH, METADATA_FILE)
        except ImportError:
            pass

    @classmethod
    def load(cls):
        if not VECTORIZER_FILE.exists() or not METADATA_FILE.exists():
            raise FileNotFoundError("Vector store not found. Build or reindex documents first.")

        with VECTORIZER_FILE.open("rb") as f:
            vectorizer = pickle.load(f)

        documents: List[Dict[str, Any]] = []
        with METADATA_FILE.open("r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    documents.append(json.loads(line))

        return cls(vectorizer=vectorizer, documents=documents)

    def retrieve(self, query: str, top_k: int = 5, min_score: float = 0.0) -> List[Dict[str, Any]]:
        if not self.documents or self.document_matrix is None or self.document_matrix.shape[0] == 0:
            return []

        expanded = expand_query(query)
        query_vector = self.vectorizer.transform([expanded])
        scores = cosine_similarity(query_vector, self.document_matrix)[0]

        query_terms = {w.lower() for w in re.findall(r"[a-zA-Z]\w+", expanded) if len(w) > 3}
        candidate_count = min(top_k * 4, len(self.documents))

        ranked = []
        upload_candidates = []
        for idx, score in enumerate(scores):
            ranked.append((idx, score))
            file_path = str(self.documents[idx].get("metadata", {}).get("file_path", "")).lower()
            if "uploads" in file_path or "upload" in file_path:
                upload_candidates.append((idx, score))

        ranked.sort(key=lambda item: item[1], reverse=True)
        candidates = [idx for idx, score in ranked[:candidate_count] if score > min_score]

        top_indices = candidates[:top_k]
        seen = set(top_indices)

        if query_terms and candidates:
            missing_terms = set(query_terms)
            for idx in top_indices:
                content = self.documents[idx].get("content", "").lower()
                missing_terms -= {t for t in missing_terms if t in content}
            for idx in candidates[top_k:]:
                if not missing_terms:
                    break
                content = self.documents[idx].get("content", "").lower()
                found = {t for t in missing_terms if t in content}
                if found:
                    top_indices.append(idx)
                    seen.add(idx)
                    missing_terms -= found

        seen_upload_files = set()
        for idx in top_indices:
            fn = self.documents[idx].get("metadata", {}).get("file_name", "")
            if fn:
                seen_upload_files.add(fn)

        if upload_candidates and min_score > 0:
            upload_candidates.sort(key=lambda item: item[1], reverse=True)
            added = 0
            for idx, score in upload_candidates:
                if score < min_score:
                    continue
                if idx in seen:
                    continue
                fn = self.documents[idx].get("metadata", {}).get("file_name", "")
                if fn and fn not in seen_upload_files:
                    top_indices.append(idx)
                    seen.add(idx)
                    seen_upload_files.add(fn)
                    added += 1
                    if added >= 2:
                        break

        results = []
        for idx in top_indices:
            if 0 <= idx < len(self.documents):
                node = dict(self.documents[idx])
                node["_score"] = float(scores[idx])
                results.append(node)
        return results

    def as_retriever(self, similarity_top_k: int = 5):
        return self


def build_vector_store(nodes: List[Dict[str, Any]]) -> TfidfVectorStore:
    store = TfidfVectorStore()
    store.add_nodes(nodes)
    store.persist()
    return store


def load_vector_store() -> TfidfVectorStore:
    if not VECTORIZER_FILE.exists() or not METADATA_FILE.exists():
        try:
            from services.remote_storage import download_file
            downloaded = download_file(B2_VECTORIZER_PATH, VECTORIZER_FILE)
            downloaded = download_file(B2_METADATA_PATH, METADATA_FILE) or downloaded
            if not downloaded:
                raise FileNotFoundError("Vector store not found.")
        except ImportError:
            raise FileNotFoundError("Vector store not found. Build or reindex documents first.")

    return TfidfVectorStore.load()
