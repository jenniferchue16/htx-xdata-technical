"""SQLite storage for transcriptions.

Every query uses ? placeholders, so user input is passed as data and never run as SQL (prevents SQL injection).
A new connection is opened per call because SQLite connections can't be shared across FastAPI's worker threads.
"""

import os
import sqlite3
from pathlib import Path

# Database and uploads live in backend/data; the tests point DATA_DIRECTORY at a temporary folder instead
DATA_DIRECTORY = Path(os.getenv("DATA_DIRECTORY", Path(__file__).parent / "data"))
DATABASE_PATH = DATA_DIRECTORY / "transcriptions.db"
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

# Creates the table on startup if it doesn't exist yet.
# created_at is set by SQLite as a UTC timestamp in ISO 8601 format, e.g. 2026-10-11T14:52:50Z
with sqlite3.connect(DATABASE_PATH) as connection:
    connection.execute("""
        CREATE TABLE IF NOT EXISTS transcriptions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            filename      TEXT NOT NULL UNIQUE,
            transcription TEXT NOT NULL,
            created_at    TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )
    """)


def save_transcription(filename, transcription):
    """Inserts a transcription and returns the saved row, including its id and created_at."""
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        # RETURNING * gives back the inserted row, so no second query is needed
        row = connection.execute(
            "INSERT INTO transcriptions (filename, transcription) VALUES (?, ?) RETURNING *",
            (filename, transcription),
        ).fetchone()
    return dict(row)


def get_all_transcriptions():
    """Returns all transcriptions, oldest first."""
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute("SELECT * FROM transcriptions ORDER BY id").fetchall()
    return [dict(row) for row in rows]


def search_transcriptions(filename):
    """Returns transcriptions whose file name contains `filename`, oldest first.

    Partial, case-insensitive match: "sample1" finds sample1.mp3 and Sample1_1.mp3.
    """
    # Escape LIKE's wildcards (% and _) so they're matched literally, e.g. "_" only matches underscores
    escaped_filename = filename.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT * FROM transcriptions WHERE filename LIKE ? ESCAPE '\\' ORDER BY id",
            (f"%{escaped_filename}%",),
        ).fetchall()
    return [dict(row) for row in rows]
