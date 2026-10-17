"""Shared helpers for AI calls: one place to call Ollama, and a result cache."""
import hashlib
import json
import os
from typing import Any, Callable

from sqlalchemy.orm import Session

from app.models import AICache

# Below this, a claim or answer is shown as "Not sure" instead of stated as fact.
NOT_SURE_BELOW = int(os.getenv("NOT_SURE_BELOW", "60"))


def model_name() -> str:
    return os.getenv("OLLAMA_MODEL", "llama3.2:3b")


def cache_key(task: str, payload: Any) -> str:
    raw = json.dumps({"task": task, "model": model_name(), "payload": payload}, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()


def cached_result(db: Session, task: str, payload: Any, compute: Callable[[], Any]) -> Any:
    """Return the stored result for this exact input, or compute and store it.

    `payload` must capture everything the AI sees (message ids AND contents),
    so an edited message changes the key and triggers a fresh call.
    """
    key = cache_key(task, payload)
    hit = db.get(AICache, key)
    if hit is not None:
        return hit.result

    result = compute()
    db.merge(AICache(key=key, task=task, result=result))
    db.commit()
    return result


def ask_ollama(system: str, payload: Any, schema: dict) -> dict:
    """One structured-JSON call to the local model. Message text is always passed as data."""
    if os.getenv("AI_PROVIDER", "ollama").lower() != "ollama":
        raise RuntimeError("AI_PROVIDER must be set to ollama")

    from ollama import chat  # imported here so the API still starts without Ollama installed

    response = chat(
        model=model_name(),
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ],
        format=schema,
        options={"temperature": 0},
    )
    content = response.message.content
    if not content:
        raise RuntimeError("Ollama returned an empty response")
    result = json.loads(content)
    if not isinstance(result, dict):
        raise RuntimeError("Ollama returned something other than a JSON object")
    return result


def message_payload(messages, limit: int = 2000) -> list[dict]:
    """The message fields the AI sees. Used both for prompts and cache keys."""
    return [
        {
            "id": m.id,
            "author": m.author_name,
            "content": (m.content or "")[:limit],
            "reply_to_id": m.reply_to_id,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
        }
        for m in messages
    ]
