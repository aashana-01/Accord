from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Topic, Message, Claim
from app.schemas import TopicCreate
from app.services.claim_extraction import (
    extract_claims_with_ollama,
    save_claims,
)
from app.services.question_answer_linking import link_question_answers

router = APIRouter(prefix="/topics", tags=["topics"])


def topic_response(topic: Topic):
    return {
        "id": topic.id,
        "title": topic.title,
        "status": topic.content_status.lower(),
        "activity": topic.lifecycle_status.lower(),
        "message_ids": [message.id for message in topic.messages],
        "is_off_topic": False,
    }


def claim_response(claim: Claim):
    return {
        "id": claim.id,
        "topic_id": claim.topic_id,
        "kind": claim.kind,
        "text": claim.text,
        "source_ids": claim.source_message_ids,
    }


@router.get("")
def list_topics(db: Session = Depends(get_db)):
    topics = db.query(Topic).order_by(Topic.created_at.desc()).all()
    return [topic_response(topic) for topic in topics]


@router.post("")
def create_topic(data: TopicCreate, db: Session = Depends(get_db)):
    topic = Topic(title=data.title, summary=data.summary or "")
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic_response(topic)


@router.get("/{topic_id}")
def get_topic(topic_id: str, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()

    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    return topic_response(topic)


@router.get("/{topic_id}/claims")
def get_topic_claims(topic_id: str, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()

    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    claims = db.query(Claim).filter(Claim.topic_id == topic_id).all()
    return [claim_response(claim) for claim in claims]



@router.post("/{topic_id}/extract")
def extract_topic_claims(topic_id: str, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()

    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    messages = (
        db.query(Message)
        .filter(Message.topic_id == topic_id)
        .order_by(Message.timestamp.asc())
        .all()
    )

    if not messages:
        raise HTTPException(
            status_code=400,
            detail="Topic has no messages",
        )

    try:
        extracted = extract_claims_with_ollama(messages)
        saved = save_claims(topic_id, extracted, db)

    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    except Exception as exc:
        # The detailed error stays in the backend terminal.
        print(f"Accord extraction error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=502,
            detail=(
                "Local AI extraction failed. Check that Ollama is running "
                "and the configured model is installed."
            ),
        )

    return {
        "topic_id": topic_id,
        "claims_extracted": len(extracted),
        "claims_saved": len(saved),
        "claims": [claim_response(claim) for claim in saved],
    }


@router.post("/{topic_id}/link-answers")
def link_topic_answers(topic_id: str, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()

    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    try:
        return {
            "topic_id": topic_id,
            **link_question_answers(topic_id, db),
        }
    except Exception as exc:
        print(f"Accord answer-linking error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Answer linking failed. Check that Ollama is running.",
        )

