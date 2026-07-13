import os
import time
from pathlib import Path
from urllib.parse import parse_qs, quote_plus, unquote, urlparse

import requests

# 1. Dinh nghia cac cau lenh tim kiem nang cao (Advanced Search Queries)
# Ep cong cu tim kiem chi tim file PDF bai giang co chua tu khoa chuyen nganh tai cac truong lon
QUERIES = [
    'site:stanford.edu filetype:pdf "retrieval augmented generation" slide OR lecture',
    'site:cmu.edu filetype:pdf "dense retrieval" OR "vector database"',
    'site:mit.edu filetype:pdf "embedding" AND "nlp" lecture',
    'site:berkeley.edu filetype:pdf "information retrieval" transformer',
]

# 2. Tao thu muc luu tru bai giang giang duong
DOWNLOAD_DIR = Path("E:/RAGChatBot/dataset/lecture-notes")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

SEARCH_URL = "https://duckduckgo.com/html/"
MAX_RESULTS_PER_QUERY = 5
REQUEST_DELAY_SECONDS = 4

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/126.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    }
)

print("Dang bat dau tim kiem va tai Lecture Notes PDF...")


def request_with_retry(url, *, params=None, stream=False, timeout=25, attempts=3):
    """Request kem retry/backoff de tranh dung ngay khi server tam thoi gioi han toc do."""
    last_error = None

    for attempt in range(1, attempts + 1):
        try:
            response = SESSION.get(url, params=params, stream=stream, timeout=timeout)

            if response.status_code == 429:
                wait_time = REQUEST_DELAY_SECONDS * attempt
                print(f"   => Bi gioi han toc do 429, doi {wait_time}s roi thu lai...")
                time.sleep(wait_time)
                continue

            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            last_error = exc
            if attempt == attempts:
                break

            wait_time = REQUEST_DELAY_SECONDS * attempt
            print(f"   => Loi ket noi, doi {wait_time}s roi thu lai: {exc}")
            time.sleep(wait_time)

    raise last_error or RuntimeError("Khong the ket noi")


def extract_duckduckgo_url(raw_href):
    """DuckDuckGo thuong boc link that trong query param uddg."""
    parsed = urlparse(raw_href)
    query = parse_qs(parsed.query)

    if "uddg" in query:
        return unquote(query["uddg"][0])

    return raw_href


def search_pdf_urls(query, max_results=MAX_RESULTS_PER_QUERY):
    params = {"q": query, "kl": "us-en"}
    response = request_with_retry(SEARCH_URL, params=params)

    # Dung regex nho o day de lay cac href ket qua tu HTML tinh cua DuckDuckGo.
    # Khong can them dependency BeautifulSoup cho mot file script don gian.
    import re

    hrefs = re.findall(r'<a[^>]+class="result__a"[^>]+href="([^"]+)"', response.text)
    pdf_urls = []
    seen = set()

    for href in hrefs:
        url = extract_duckduckgo_url(href.replace("&amp;", "&"))
        clean_url = url.split("#", 1)[0]

        if ".pdf" not in clean_url.lower():
            continue

        if clean_url in seen:
            continue

        seen.add(clean_url)
        pdf_urls.append(clean_url)

        if len(pdf_urls) >= max_results:
            break

    return pdf_urls


def safe_pdf_filename(url):
    parsed = urlparse(url)
    file_name = unquote(os.path.basename(parsed.path)) or "lecture-note.pdf"

    if not file_name.lower().endswith(".pdf"):
        file_name += ".pdf"

    return "".join(c if c.isalnum() or c in "._-" else "_" for c in file_name)


def download_pdf(url, file_path):
    response = request_with_retry(url, stream=True)
    content_type = response.headers.get("Content-Type", "").lower()

    first_chunk = b""
    chunks = []

    for chunk in response.iter_content(chunk_size=8192):
        if not chunk:
            continue

        if not first_chunk:
            first_chunk = chunk[:8]

        chunks.append(chunk)

    if "pdf" not in content_type and not first_chunk.startswith(b"%PDF"):
        raise ValueError("URL khong tra ve noi dung PDF")

    with open(file_path, "wb") as file:
        for chunk in chunks:
            file.write(chunk)


downloaded_count = 0

for query in QUERIES:
    print(f"\nDang quet: {query}")

    try:
        results = search_pdf_urls(query)

        if not results:
            print("   => Khong tim thay PDF nao cho truy van nay.")
            continue

        for url in results:
            file_name = safe_pdf_filename(url)
            file_path = DOWNLOAD_DIR / file_name

            if file_path.exists():
                print(f"   => Da co san, bo qua: {file_name[:60]}")
                continue

            print(f"Dang tai file bai giang: {file_name[:60]}")

            try:
                download_pdf(url, file_path)
                print("   => Luu thanh cong!")
                downloaded_count += 1
            except Exception as exc:
                if file_path.exists() and file_path.stat().st_size == 0:
                    file_path.unlink()
                print(f"   => Loi tai file: {exc}")

            time.sleep(REQUEST_DELAY_SECONDS)

    except Exception as exc:
        print(f"Loi khi quet tu khoa: {exc}")

    time.sleep(REQUEST_DELAY_SECONDS)

print("\nHOAN THANH!")
print(f"Thu muc luu tru bai giang: {DOWNLOAD_DIR}")
print(f"Tong so file slide bai giang PDF tai duoc: {downloaded_count}")
