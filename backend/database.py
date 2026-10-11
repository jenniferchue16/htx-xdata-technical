import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).parent / "transcriptions.db"

# Creates the table on startup if it doesn't exist yet
with sqlite3.connect(DATABASE_PATH) as connection:
    connection.execute("""
        CREATE TABLE IF NOT EXISTS transcriptions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            filename      TEXT NOT NULL,
            transcription TEXT NOT NULL,
            created_at    TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )
    """)


def save_transcription(filename, transcription):
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            "INSERT INTO transcriptions (filename, transcription) VALUES (?, ?) RETURNING *",
            (filename, transcription),
        ).fetchone()
    return dict(row)


def get_all_transcriptions():
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute("SELECT * FROM transcriptions ORDER BY id").fetchall()
    return [dict(row) for row in rows]


def search_transcriptions(filename):
    # Partial, case-insensitive match: "sample1" finds sample1.mp3 and sample1_1.mp3
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT * FROM transcriptions WHERE filename LIKE ? ORDER BY id",
            (f"%{filename}%",),
        ).fetchall()
    return [dict(row) for row in rows]
