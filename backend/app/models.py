import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db import Base


def generate_id():
    return str(uuid.uuid4())


def utc_now():
    return datetime.now(timezone.utc)


class Topic(Base):
    __tablename__ = "topics"

    id = Column(String, primary_key=True, default=generate_id)
    title = Column(String(300), nullable=False)
    summary = Column(Text, default="")
    content_status = Column(String(30), default="Open", nullable=False)
    lifecycle_status = Column(String(30), default="Active", nullable=False)
    guild_id = Column(String(30), nullable=True)
    channel_id = Column(String(30), nullable=True)
    message_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_activity = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    messages = relationship("Message", back_populates="topic")
    claims = relationship("Claim", back_populates="topic")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(30), primary_key=True)  # Discord message ID
    topic_id = Column(
        String, ForeignKey("topics.id", ondelete="SET NULL"), nullable=True
    )
    guild_id = Column(String(30), nullable=True)
    channel_id = Column(String(30), nullable=False)
    author_id = Column(String(30), nullable=False)
    author_name = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    reply_to_id = Column(String(30), ForeignKey("messages.id"), nullable=True)

    topic = relationship("Topic", back_populates="messages")


class Claim(Base):
    __tablename__ = "claims"

    id = Column(String, primary_key=True, default=generate_id)
    topic_id = Column(
        String, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False
    )
    kind = Column(String(30), nullable=False)
    text = Column(Text, nullable=False)
    source_message_ids = Column(JSON, default=list, nullable=False)
    verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    topic = relationship("Topic", back_populates="claims")
