from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Claim, Topic
from app.schemas import ClaimOut, TopicCreate, TopicOut

router = APIRouter(prefix="/topics", tags=["topics"])


@router.get("", response_model=list[TopicOut])
def list_topics(db: Session = Depends(get_db)):
    return (
        db.query(Topic)
        .order_by(Topic.last_activity.desc())
        .all()
    )

@router.post("", response_model=TopicOut, status_code=status.HTTP_201_CREATED)
def create_topic(
    topic_data: TopicCreate,
    db: Session = Depends(get_db),
):
    topic = Topic(**topic_data.model_dump())

    db.add(topic)
    db.commit()
    db.refresh(topic)

    return topic

@router.get("/{topic_id}", response_model=TopicOut)
def get_topic(topic_id: str, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()

    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    return topic


@router.get("/{topic_id}/claims", response_model=list[ClaimOut])
def list_topic_claims(topic_id: str, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()

    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    return (
        db.query(Claim)
        .filter(Claim.topic_id == topic_id)
        .order_by(Claim.created_at.desc())
        .all()
    )