from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ContentStatus = Literal["Open", "Debating", "Decided"]
LifecycleStatus = Literal["Active", "Dormant", "Reopened"]


class TopicCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    summary: str = ""
    content_status: ContentStatus = "Open"
    lifecycle_status: LifecycleStatus = "Active"
    guild_id: str | None = None
    channel_id: str | None = None


class TopicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    summary: str
    content_status: ContentStatus
    lifecycle_status: LifecycleStatus
    guild_id: str | None
    channel_id: str | None
    message_count: int
    created_at: datetime
    last_activity: datetime


class ClaimOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    topic_id: str
    kind: str
    text: str
    source_message_ids: list[str]
    verified: bool
    created_at: datetime
