"""Adds new columns to an existing database.

`Base.metadata.create_all` creates missing tables but never adds columns to
tables that already exist, so anyone with an older accord.db would crash.
This runs on startup and adds whatever is missing. Safe to run every time.
"""
from sqlalchemy import inspect, text

from app.db import engine

NEW_COLUMNS = {
    "topics": {
        "kind": "VARCHAR(20) NOT NULL DEFAULT 'discussion'",
        "is_off_topic": "BOOLEAN NOT NULL DEFAULT 0",
    },
    "claims": {
        "confidence": "INTEGER NOT NULL DEFAULT 100",
        "superseded_by_id": "VARCHAR",
        "origin": "VARCHAR(20) NOT NULL DEFAULT 'ai'",
    },
    "messages": {
        "edited": "BOOLEAN NOT NULL DEFAULT 0",
    },
}


def ensure_columns() -> None:
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, columns in NEW_COLUMNS.items():
            if not inspector.has_table(table):
                continue
            existing = {column["name"] for column in inspector.get_columns(table)}
            for name, ddl in columns.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
