from rag.load import load_documents
from rag.chunking import split_documents
from rag.vector_store import build_vector_store

print("Loading documents from uploads...")
docs = load_documents()
print(f"Loaded {len(docs)} documents")

print("Splitting documents into chunks...")
nodes = split_documents(docs)
print(f"Created {len(nodes)} chunks")

if nodes:
    print("Building vector store...")
    build_vector_store(nodes)
    print("Vector store built successfully!")
else:
    print("No documents to index.")
