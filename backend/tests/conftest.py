import os
import sys
import tempfile
from pathlib import Path

# A throwaway database and no network calls to the LLM during tests.
os.environ["DATABASE_PATH"] = str(Path(tempfile.mkdtemp()) / "test.db")
os.environ["KICKSCOPE_LLM"] = "off"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
