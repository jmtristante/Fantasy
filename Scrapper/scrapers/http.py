import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from config import CACHE_DIR, HEADERS, REQUEST_SLEEP

_session = requests.Session()
_session.headers.update(HEADERS)


def fetch(url, retries=2, timeout=30):
    last_error = None
    for attempt in range(retries + 1):
        try:
            resp = _session.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp.text
        except requests.RequestException as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(2 * (attempt + 1))
    raise last_error


def fetch_cached(url, cache_name, refresh=False, delay=True):
    cache_file = Path(CACHE_DIR) / cache_name
    if not refresh and cache_file.exists():
        return cache_file.read_text(encoding="utf-8")
    html = fetch(url)
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(html, encoding="utf-8")
    if delay and REQUEST_SLEEP:
        time.sleep(REQUEST_SLEEP)
    return html


def to_soup(html):
    return BeautifulSoup(html, "html.parser")


def to_int(value):
    if value in (None, ""):
        return None
    try:
        return int(str(value).replace(".", "").replace(",", ""))
    except (TypeError, ValueError):
        return None


def to_float(value):
    if value in (None, ""):
        return None
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return None


def to_pct(value):
    if not value:
        return None
    match = re.search(r"(\d+)", str(value))
    return int(match.group(1)) if match else None


def equipo_id_from_img(img):
    if not img:
        return None
    src = img.get("data-src") or img.get("src") or ""
    match = re.search(r"escudom/(\d+)\.png", src)
    return int(match.group(1)) if match else None
