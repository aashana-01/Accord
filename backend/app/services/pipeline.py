"""Runs the full analysis for one channel:
split into conversations -> extract claims -> merge repeats -> link answers -> review -> status/activity.

Every AI step is cached on its exact input, so re-running with no new messages makes no AI calls.
If one step fails (e.g. Ollama is down) the rest still run and the error is reported.
"""
from sqlalchemy.orm import Session

from app.models import Message
from app.services.ai import cached_result, message_payload
from app.services.claim_extraction import extract_claims_with_ollama, prune_invalid_sources, save_claims
from app.services.claim_review import merge_near_duplicates, review_claims
from app.services.question_answer_linking import link_question_answers
from app.services.segmentation import segment_channel
from app.services.topic_state import refresh_topic_state


def analyze_channel(channel_id: str, db: Session, guild_id: str | None = None) -> dict:
    errors: list[str] = []

    try:
        topics = segment_channel(channel_id, db, guild_id)
    except Exception as exc:  # keep going with whatever topics already exist
        db.rollback()
        errors.append(f"segmentation: {type(exc).__name__}: {exc}")
        from app.models import Topic
        topics = db.query(Topic).filter(Topic.channel_id == channel_id).all()

    for topic in topics:
        if not topic.is_off_topic:
            messages = (
                db.query(Message).filter(Message.topic_id == topic.id).order_by(Message.timestamp.asc()).all()
            )
            steps = [
                ("prune", lambda: prune_invalid_sources(topic.id, db)),
                ("extract", lambda: save_claims(
                    topic.id,
                    cached_result(db, "extract_claims", {"messages": message_payload(messages[-100:], 3000)},
                                  lambda: extract_claims_with_ollama(messages)),
                    db,
                )),
                ("merge", lambda: merge_near_duplicates(topic.id, db)),
                ("link_answers", lambda: link_question_answers(topic.id, db)),
                ("review", lambda: review_claims(topic.id, db)),
            ]
            for name, run in steps:
                if not messages:
                    break
                try:
                    run()
                except Exception as exc:
                    db.rollback()
                    errors.append(f"{topic.title} / {name}: {type(exc).__name__}: {exc}")
        refresh_topic_state(topic, db)

    return {
        "channel_id": channel_id,
        "conversations": len(topics),
        "topics": [{"id": t.id, "title": t.title} for t in topics],
        "errors": errors,
    }
