"""Endpoints behind the top menu: server info, Poll and Actions."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ChannelInfo, Message, Poll, Task
from app.services import assistant
from app.services import polls as poll_service
from app.services import tasks as task_service
from app.services.discord_api import DiscordError

router = APIRouter(tags=["workspace"])


def _fail(exc: Exception):
    if isinstance(exc, ValueError):
        raise HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, DiscordError):
        raise HTTPException(status_code=502, detail=str(exc))
    raise exc


# ---------- server info + people ----------
@router.get("/channels/{channel_id}/info")
def channel_info(channel_id: str, db: Session = Depends(get_db)):
    info = db.get(ChannelInfo, channel_id)
    people = (
        db.query(Message.author_id, func.max(Message.author_name))
        .filter(Message.channel_id == channel_id)
        .group_by(Message.author_id)
        .all()
    )
    return {
        "channel_id": channel_id,
        "channel_name": info.channel_name if info else "",
        "guild_id": poll_service.guild_for(db, channel_id),
        "guild_name": info.guild_name if info else "",
        "people": sorted(({"id": pid, "name": name} for pid, name in people), key=lambda p: p["name"].casefold()),
    }


# ---------- polls ----------
class PollIn(BaseModel):
    question: str = Field(max_length=300)
    options: list[str]
    duration_hours: int = 24
    allow_multiselect: bool = False
    topic_id: str | None = None
    claim_id: str | None = None
    created_by: str | None = None  # None = anonymous


@router.get("/channels/{channel_id}/polls")
def list_polls(channel_id: str, sync: bool = True, db: Session = Depends(get_db)):
    guild = poll_service.guild_for(db, channel_id)
    polls = db.query(Poll).filter(Poll.channel_id == channel_id).order_by(Poll.created_at.desc()).all()
    errors = []
    if sync:
        for poll in polls:
            try:
                poll_service.sync_poll(db, poll)
            except Exception as exc:  # show stored results if Discord can't be reached
                errors.append(str(exc))
    return {"polls": [poll_service.poll_out(p, guild) for p in polls], "sync_errors": errors[:1]}


@router.post("/channels/{channel_id}/polls")
def create_poll(channel_id: str, body: PollIn, db: Session = Depends(get_db)):
    try:
        poll = poll_service.create_poll(db, channel_id, body.question, body.options, body.duration_hours,
                                        body.allow_multiselect, body.topic_id, body.claim_id, body.created_by)
    except Exception as exc:
        _fail(exc)
    return poll_service.poll_out(poll, poll_service.guild_for(db, channel_id))


@router.post("/polls/{poll_id}/end")
def end_poll(poll_id: str, db: Session = Depends(get_db)):
    poll = db.get(Poll, poll_id)
    if poll is None:
        raise HTTPException(status_code=404, detail="Poll not found")
    try:
        poll = poll_service.end_poll(db, poll)
    except Exception as exc:
        _fail(exc)
    return poll_service.poll_out(poll, poll_service.guild_for(db, poll.channel_id))


# ---------- tasks ----------
class TaskIn(BaseModel):
    title: str = Field(max_length=200)
    topic_id: str | None = None
    claim_id: str | None = None
    message_id: str | None = None
    assignee_id: str | None = None
    due_date: str | None = None
    created_by: str | None = None  # None = anonymous


class TaskPatch(BaseModel):
    status: str | None = None
    title: str | None = None
    assignee_id: str | None = "__keep__"
    due_date: str | None = "__keep__"


@router.get("/channels/{channel_id}/tasks")
def list_tasks(channel_id: str, db: Session = Depends(get_db)):
    guild = poll_service.guild_for(db, channel_id)
    tasks = db.query(Task).filter(Task.channel_id == channel_id).order_by(Task.created_at.desc()).all()
    return {"tasks": [task_service.task_out(t, guild) for t in tasks]}


@router.post("/channels/{channel_id}/tasks")
def create_task(channel_id: str, body: TaskIn, db: Session = Depends(get_db)):
    guild = poll_service.guild_for(db, channel_id)
    try:
        task, warning = task_service.create_task(db, channel_id, body.title, body.topic_id, body.claim_id,
                                                 body.message_id, body.assignee_id, body.due_date,
                                                 body.created_by, guild)
    except Exception as exc:
        _fail(exc)
    return {"task": task_service.task_out(task, guild), "warning": warning}


@router.patch("/tasks/{task_id}")
def update_task(task_id: str, body: TaskPatch, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    guild = poll_service.guild_for(db, task.channel_id)
    try:
        task, warning = task_service.update_task(db, task, guild, body.status, body.assignee_id,
                                                 body.due_date, body.title)
    except Exception as exc:
        _fail(exc)
    return {"task": task_service.task_out(task, guild), "warning": warning}


@router.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"deleted": task_id}


# ---------- chatbot + translation ----------
class ChatIn(BaseModel):
    question: str = Field(max_length=500)


@router.post("/channels/{channel_id}/chat")
def chat(channel_id: str, body: ChatIn, db: Session = Depends(get_db)):
    try:
        return assistant.answer(db, channel_id, body.question, poll_service.guild_for(db, channel_id))
    except Exception as exc:
        _fail(exc)


class TranslateIn(BaseModel):
    language: str
    texts: list[str]


@router.post("/translate")
def translate(body: TranslateIn, db: Session = Depends(get_db)):
    try:
        return {"translations": assistant.translate(db, body.language, body.texts)}
    except ValueError as exc:
        _fail(exc)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Translation needs Ollama running ({exc})")
