"""Action items linked to conversations, points or Discord messages. Assigning someone posts a notice in Discord."""
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.models import Claim, Message, Task, Topic
from app.services import discord_api

STATUSES = ("todo", "in_progress", "done")


def task_out(task: Task, guild_id: str | None) -> dict:
    return {
        "id": task.id,
        "topic_id": task.topic_id,
        "claim_id": task.claim_id,
        "message_id": task.message_id,
        "title": task.title,
        "assignee_id": task.assignee_id,
        "assignee_name": task.assignee_name,
        "created_by": task.created_by,
        "status": task.status,
        "due_date": task.due_date,
        "discord_url": discord_api.message_link(guild_id, task.channel_id, task.message_id)
        if task.message_id else None,
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
    }


def _check_due(due: str | None) -> str | None:
    if not due:
        return None
    try:
        date.fromisoformat(due)
    except ValueError:
        raise ValueError("Due date must look like 2026-10-18.")
    return due


def _assignee(db: Session, channel_id: str, assignee_id: str | None) -> tuple[str | None, str | None]:
    if not assignee_id:
        return None, None
    m = db.query(Message).filter(Message.channel_id == channel_id, Message.author_id == assignee_id).first()
    if m is None:
        raise ValueError("That person hasn't posted in this channel.")
    return assignee_id, m.author_name


def notify(db: Session, task: Task, guild_id: str | None) -> None:
    """'📌 New task from Pearl: … → @Aashana · due … · linked to …' (only mentions the assignee)."""
    parts = [f"📌 **{'Task assigned' if task.assignee_id else 'New task'}**"]
    if task.created_by:
        parts.append(f"from {task.created_by}")
    line = " ".join(parts) + f": {task.title}"
    if task.assignee_id:
        line += f" → <@{task.assignee_id}>"
    if task.due_date:
        line += f" · due {task.due_date}"
    if task.claim_id and (claim := db.get(Claim, task.claim_id)):
        line += f"\n↳ linked to {claim.kind}: *{claim.text[:120]}*"
    elif task.topic_id and (topic := db.get(Topic, task.topic_id)):
        line += f"\n↳ linked to conversation: *{topic.title}*"
    discord_api.send_message(
        task.channel_id, line,
        mention_user_ids=[task.assignee_id] if task.assignee_id else [],
        reply_to=task.message_id,
    )


def create_task(db: Session, channel_id: str, title: str, topic_id: str | None, claim_id: str | None,
                message_id: str | None, assignee_id: str | None, due_date: str | None,
                created_by: str | None, guild_id: str | None) -> tuple[Task, str | None]:
    title = " ".join(title.split())
    if not title:
        raise ValueError("Give the task a title.")
    if len(title) > 200:
        raise ValueError("Task titles can be at most 200 characters.")
    if claim_id and (claim := db.get(Claim, claim_id)):
        topic_id = topic_id or claim.topic_id
    if message_id:
        msg = db.get(Message, message_id)
        if msg is None or msg.channel_id != channel_id:
            raise ValueError("That message isn't in this channel.")
        topic_id = topic_id or msg.topic_id
    aid, aname = _assignee(db, channel_id, assignee_id)
    task = Task(channel_id=channel_id, topic_id=topic_id, claim_id=claim_id, message_id=message_id,
                title=title, assignee_id=aid, assignee_name=aname, due_date=_check_due(due_date),
                created_by=created_by)
    db.add(task)
    db.commit()
    db.refresh(task)
    warning = None
    try:
        notify(db, task, guild_id)
    except Exception as exc:  # the task is saved either way
        warning = f"Saved, but the Discord notice failed: {exc}"
    return task, warning


def update_task(db: Session, task: Task, guild_id: str | None, status: str | None = None,
                assignee_id: str | None = "__keep__", due_date: str | None = "__keep__",
                title: str | None = None) -> tuple[Task, str | None]:
    reassigned = False
    if status is not None:
        if status not in STATUSES:
            raise ValueError("Unknown status.")
        task.status = status
    if title is not None:
        title = " ".join(title.split())
        if not title:
            raise ValueError("Give the task a title.")
        task.title = title[:200]
    if assignee_id != "__keep__":
        aid, aname = _assignee(db, task.channel_id, assignee_id)
        reassigned = aid != task.assignee_id and aid is not None
        task.assignee_id, task.assignee_name = aid, aname
    if due_date != "__keep__":
        task.due_date = _check_due(due_date)
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    warning = None
    if reassigned:
        try:
            notify(db, task, guild_id)
        except Exception as exc:
            warning = f"Saved, but the Discord notice failed: {exc}"
    return task, warning
