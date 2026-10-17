"""Keeps saved messages in sync with Discord: skip bots, apply edits, remove deleted messages."""
from sqlalchemy.orm import Session

from app.models import Claim, Message, QuestionAnswerLink


def is_human(author) -> bool:
    """Bots (including Accord itself) and system messages are never analyzed."""
    return not getattr(author, "bot", False) and not getattr(author, "system", False)


def apply_edit(db: Session, message_id: str, new_content: str) -> bool:
    """Returns True if a saved message changed. The AI cache key includes content, so the
    next analysis re-runs for that conversation automatically."""
    message = db.get(Message, message_id)
    if message is None or message.content == new_content:
        return False
    message.content = new_content
    message.edited = True
    db.commit()
    return True


def apply_delete(db: Session, message_id: str) -> bool:
    """Removes a deleted message and every reference to it, so no claim cites a message
    that no longer exists. Claims left with no sources are removed too."""
    message = db.get(Message, message_id)
    if message is None:
        return False

    for claim in db.query(Claim).filter(Claim.topic_id == message.topic_id).all():
        sources = [s for s in (claim.source_message_ids or []) if s != message_id]
        if sources != (claim.source_message_ids or []):
            if sources:
                claim.source_message_ids = sources
            else:
                db.query(QuestionAnswerLink).filter(QuestionAnswerLink.question_claim_id == claim.id).delete()
                for other in db.query(Claim).filter(Claim.superseded_by_id == claim.id).all():
                    other.superseded_by_id = None
                db.delete(claim)

    for link in db.query(QuestionAnswerLink).filter(QuestionAnswerLink.topic_id == message.topic_id).all():
        answers = [a for a in (link.answer_message_ids or []) if a != message_id]
        if answers != (link.answer_message_ids or []):
            if answers:
                link.answer_message_ids = answers
            else:
                db.delete(link)

    db.query(Message).filter(Message.reply_to_id == message_id).update({Message.reply_to_id: None})
    db.delete(message)
    db.commit()
    return True
