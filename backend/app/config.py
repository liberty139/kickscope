"""Settings from the environment, with an optional .env next to the project root for local runs."""

from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _load_dotenv() -> None:
    env = ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()

OLLAMA_KEY = os.getenv("OLLAMA_API_KEY") or None
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "https://ollama.com" if OLLAMA_KEY else "http://127.0.0.1:11434").rstrip("/")
LLM_MODEL = os.getenv("LLM_MODEL", "gemma4:31b")
LLM_ENABLED = os.getenv("KICKSCOPE_LLM", "on").lower() not in ("off", "0", "false")
DB_PATH = Path(os.getenv("DATABASE_PATH", ROOT / "backend" / "data" / "kickscope.db"))
DIST = ROOT / "frontend" / "dist"
