from rag.vector_store import load_vector_store
from rag.prompts import build_context
from config.settings import settings
from rag.cache import SimpleCache

retrieval_cache = SimpleCache(max_entries=256)
_vector_store_instance = None

def get_retriever():
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = load_vector_store()
    return _vector_store_instance


def reload_vector_store() -> None:
    """Reload index from disk and clear retrieval cache after upload/reindex."""
    global _vector_store_instance
    try:
        _vector_store_instance = load_vector_store()
    except FileNotFoundError:
        _vector_store_instance = None
    retrieval_cache.clear()


_STOP_WORDS = frozenset({
    "what", "how", "why", "when", "where", "which", "who", "whom",
    "this", "that", "these", "those", "the", "a", "an", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may",
    "might", "can", "shall", "not", "no", "nor", "but", "or", "and",
    "for", "to", "of", "in", "on", "at", "by", "with", "from", "into",
    "about", "like", "than", "then", "also", "very", "just", "its",
})

def _extract_key_terms(query: str) -> set:
    import re
    words = re.findall(r"[a-zA-Z]\w+", query.lower())
    return {w for w in words if len(w) > 3 and w not in _STOP_WORDS}


def retrieve_context(query: str, top_k: int | None = None, allow_broad: bool = True):
    normalized_query = (query or "").strip()
    cache_key = f"{normalized_query.lower()}::{top_k or settings.TOP_K}"
    cached = retrieval_cache.get(cache_key)
    if cached is not None:
        return cached

    retriever = get_retriever()
    top_k_val = max(3, min(top_k or settings.TOP_K, 15))
    nodes = retriever.retrieve(normalized_query, top_k=top_k_val)

    # If no results, try with original query
    if not nodes and normalized_query != query.strip():
        nodes = retriever.retrieve(query.strip(), top_k=top_k_val)

    # Fallback: lower min_score to zero to get any match
    if not nodes:
        nodes = retriever.retrieve(normalized_query, top_k=top_k_val, min_score=0.0)

    # Use expanded query terms for re-ranking/filtering so acronym expansions match
    from rag.vector_store import expand_query
    expanded_query = expand_query(normalized_query)
    query_terms = _extract_key_terms(expanded_query)

    # Two-stage: broad search if key terms missing from retrieved content
    if allow_broad and nodes and query_terms:
        found_terms = set()
        for node in nodes:
            content = node.get("content", "").lower()
            for t in query_terms:
                if t in content:
                    found_terms.add(t)
        avg_score = sum(n.get("_score", 0) for n in nodes) / len(nodes) if nodes else 0
        if len(found_terms) < max(1, len(query_terms) // 2) and avg_score < 0.3:
            broad_nodes = retriever.retrieve(
                normalized_query,
                top_k=settings.BROAD_TOP_K,
                min_score=settings.MIN_SIMILARITY_SCORE,
            )
            if not broad_nodes:
                broad_nodes = retriever.retrieve(normalized_query, top_k=settings.BROAD_TOP_K, min_score=0.0)
            if broad_nodes:
                broad_avg = sum(n.get("_score", 0) for n in broad_nodes) / len(broad_nodes)
                if broad_avg > avg_score:
                    nodes = broad_nodes

    # Re-rank and filter: chunks containing more key terms appear first;
    # drop chunks that contain none of the query terms in their first 600 chars
    if nodes and query_terms:
        def term_score(n):
            head = n.get("content", "").lower()[:600]
            return sum(1 for t in query_terms if t in head)
        nodes.sort(key=lambda n: (term_score(n), n.get("_score", 0)), reverse=True)
        nodes = [n for n in nodes if term_score(n) > 0]

    retrieval_cache.set(cache_key, nodes)
    return nodes


def rewrite_question(question, history):
    question = (question or "").strip()
    if not question:
        return ""

    # If no history, return as-is
    if not history or len(history) < 2:
        return question

    # Get last few messages for context
    history_text = "\n".join(
        f"{m['role']}: {m['content']}"
        for m in history[-4:]
    )

    # Simple heuristic-based rewriting
    question_lower = question.lower()
    
    # If question contains pronouns or is very short, add context
    if any(word in question_lower for word in ["it", "this", "that", "those", "they", "them", "he", "she", "the"]):
        return f"{question} (Context: {history_text})"

    if len(question.split()) <= 3:
        return f"{question} (Context: {history_text})"

    return question


