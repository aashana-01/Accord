"""Channel-level endpoints: run the analysis, and give the mind map everything in one response."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ChannelInfo, Claim, Message, QuestionAnswerLink, Topic
from app.services.ai import NOT_SURE_BELOW
from app.services.pipeline import analyze_channel

router = APIRouter(prefix="/channels", tags=["channels"])


@router.post("/{channel_id}/analyze")
def analyze(channel_id: str, db: Session = Depends(get_db)):
    if not db.query(Message).filter(Message.channel_id == channel_id).first():
        raise HTTPException(status_code=404, detail="No messages imported for this channel yet")
    return analyze_channel(channel_id, db)


@router.get("/{channel_id}/view")
def channel_view(channel_id: str, name: str = "channel", db: Session = Depends(get_db)):
    """Matches the frontend's types.ts exactly (messages, topics, claims)."""
    topics = db.query(Topic).filter(Topic.channel_id == channel_id).all()
    topic_ids = [t.id for t in topics]
    messages = (
        db.query(Message).filter(Message.topic_id.in_(topic_ids)).order_by(Message.timestamp.asc()).all()
        if topic_ids else []
    )
    claims = db.query(Claim).filter(Claim.topic_id.in_(topic_ids)).all() if topic_ids else []
    links = {
        link.question_claim_id: link
        for link in db.query(QuestionAnswerLink).filter(QuestionAnswerLink.topic_id.in_(topic_ids)).all()
    } if topic_ids else {}
    by_id = {m.id: m for m in messages}

    def claim_out(c: Claim) -> dict:
        out = {
            "id": c.id,
            "topic_id": c.topic_id,
            "kind": c.kind,
            "text": c.text,
            "source_ids": c.source_message_ids or [],
            "confidence": c.confidence,
            "superseded_by": c.superseded_by_id,
            "origin": c.origin or "ai",
        }
        link = links.get(c.id)
        # An unsure answer leaves the question open instead of stating a guess as fact.
        if c.kind == "question" and link and link.confidence >= NOT_SURE_BELOW:
            answer_msgs = [by_id[a] for a in link.answer_message_ids if a in by_id]
            if answer_msgs:
                text = " ".join(m.content for m in answer_msgs)
                out["answer"] = text if len(text) <= 160 else text[:157] + "..."
                out["answer_source_ids"] = [m.id for m in answer_msgs]
        return out

    info = db.get(ChannelInfo, channel_id)
    return {
        "channel": {"id": channel_id, "name": (info.channel_name if info and info.channel_name else name),
                    "guild": info.guild_name if info else "", "guild_id": info.guild_id if info else None},
        "messages": [
            {"id": m.id, "author": m.author_name, "timestamp": m.timestamp.isoformat(),
             "content": m.content, "reply_to": m.reply_to_id, "topic_id": m.topic_id}
            for m in messages
        ],
        "topics": [
            {"id": t.id, "title": t.title, "status": t.content_status.lower(),
             "activity": t.lifecycle_status.lower(), "kind": t.kind,
             "message_ids": [m.id for m in messages if m.topic_id == t.id],
             "is_off_topic": bool(t.is_off_topic)}
            for t in topics
        ],
        "claims": [claim_out(c) for c in claims],
    }
