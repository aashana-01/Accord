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
    # Set by AI segmentation: "argument" (for vs. against) or "discussion"
    kind = Column(String(20), default="discussion", nullable=False)
    is_off_topic = Column(Boolean, default=False, nullable=False)
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
    edited = Column(Boolean, default=False, nullable=False)

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
    # 0-100 from the AI review pass; below NOT_SURE_BELOW the UI marks it "Not sure"
    confidence = Column(Integer, default=100, nullable=False)
    # A decision replaced by a newer decision points at the newer one
    superseded_by_id = Column(String, ForeignKey("claims.id"), nullable=True)
    # "ai" (extracted from chat) or "poll" (a Discord poll's winner). Poll claims are never auto-pruned.
    origin = Column(String(20), default="ai", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    topic = relationship("Topic", back_populates="claims")


class QuestionAnswerLink(Base):
    __tablename__ = "question_answer_links"

    id = Column(String, primary_key=True, default=generate_id)
    topic_id = Column(
        String, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False
    )
    question_claim_id = Column(
        String, ForeignKey("claims.id", ondelete="CASCADE"),
        nullable=False, unique=True
    )
    answer_message_ids = Column(JSON, default=list, nullable=False)
    confidence = Column(Integer, default=0, nullable=False)
    rationale = Column(Text, default="", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class AICache(Base):
    """Stores AI results keyed by a hash of their exact input.

    Same messages in -> same result out, with no new AI call. Makes reruns
    instant and lets the demo work even if Ollama is down.
    """

    __tablename__ = "ai_cache"

    key = Column(String(64), primary_key=True)
    task = Column(String(50), nullable=False)
    result = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class ChannelInfo(Base):
    """Names Discord gives us during /accord, so the page can show the server name."""

    __tablename__ = "channel_info"

    channel_id = Column(String(30), primary_key=True)
    guild_id = Column(String(30), nullable=True)
    guild_name = Column(String(100), default="", nullable=False)
    channel_name = Column(String(100), default="", nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class Poll(Base):
    """A native Discord poll published from Accord, linked to a conversation (and optionally a claim)."""

    __tablename__ = "polls"

    id = Column(String, primary_key=True, default=generate_id)
    channel_id = Column(String(30), nullable=False)
    topic_id = Column(String, ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    claim_id = Column(String, ForeignKey("claims.id", ondelete="SET NULL"), nullable=True)
    question = Column(String(300), nullable=False)
    options = Column(JSON, default=list, nullable=False)  # list[str]
    duration_hours = Column(Integer, default=24, nullable=False)
    allow_multiselect = Column(Boolean, default=False, nullable=False)
    created_by = Column(String(100), nullable=True)  # None = anonymous
    discord_message_id = Column(String(30), nullable=True)
    status = Column(String(20), default="open", nullable=False)  # open | closed
    results = Column(JSON, default=list, nullable=False)  # list[{"text", "votes"}]
    decision_claim_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class Task(Base):
    """An action item linked to a conversation, decision/point, or Discord message."""

    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=generate_id)
    channel_id = Column(String(30), nullable=False)
    topic_id = Column(String, ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    claim_id = Column(String, ForeignKey("claims.id", ondelete="SET NULL"), nullable=True)
    message_id = Column(String(30), nullable=True)
    title = Column(String(200), nullable=False)
    assignee_id = Column(String(30), nullable=True)
    assignee_name = Column(String(100), nullable=True)
    created_by = Column(String(100), nullable=True)  # None = anonymous
    status = Column(String(20), default="todo", nullable=False)  # todo | in_progress | done
    due_date = Column(String(10), nullable=True)  # YYYY-MM-DD
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
