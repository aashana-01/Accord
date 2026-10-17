"""Works out each topic's Activity (from time) and Status (from its claims). No AI needed."""
import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Claim, Message, Topic
from app.services.ai import NOT_SURE_BELOW

# 24 h normally. Set DORMANT_AFTER_SECONDS=120 in .env for the live demo.
DORMANT_AFTER_SECONDS = int(os.getenv("DORMANT_AFTER_SECONDS", "86400"))


def as_utc(dt: datetime) -> datetime:
    # SQLite gives back naive datetimes; treat them as UTC.
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def compute_activity(timestamps: list[datetime], now: datetime) -> str:
    """dormant: quiet for too long. reopened: went quiet once, then came back. active: otherwise."""
    if not timestamps:
        return "Dormant"
    times = sorted(as_utc(t) for t in timestamps)
    if (as_utc(now) - times[-1]).total_seconds() > DORMANT_AFTER_SECONDS:
        return "Dormant"
    biggest_gap = max(((b - a).total_seconds() for a, b in zip(times, times[1:])), default=0)
    return "Reopened" if biggest_gap > DORMANT_AFTER_SECONDS else "Active"


def compute_status(claims: list[Claim]) -> str:
    """Decided needs a confident, still-current decision. Popular opinion alone is not a decision."""
    live = [c for c in claims if not c.superseded_by_id]
    if any(c.kind == "decision" and (c.confidence or 0) >= NOT_SURE_BELOW for c in live):
        return "Decided"
    sides = {c.kind for c in live}
    proposals = sum(c.kind == "proposal" for c in live)
    if "for" in sides or "against" in sides or proposals >= 2:
        return "Debating"
    return "Open"


def refresh_topic_state(topic: Topic, db: Session, now: datetime | None = None) -> Topic:
    now = now or datetime.now(timezone.utc)
    messages = db.query(Message).filter(Message.topic_id == topic.id).all()
    claims = db.query(Claim).filter(Claim.topic_id == topic.id).all()

    topic.message_count = len(messages)
    if messages:
        topic.last_activity = max(as_utc(m.timestamp) for m in messages)
    topic.lifecycle_status = compute_activity([m.timestamp for m in messages], now)
    topic.content_status = "Open" if topic.is_off_topic else compute_status(claims)
    db.commit()
    return topic
