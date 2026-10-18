"""Native Discord polls published from Accord. When a poll ends, its winner becomes a Decision."""
from sqlalchemy.orm import Session

from app.models import ChannelInfo, Claim, Poll, Topic
from app.services import discord_api
from app.services.topic_state import refresh_topic_state

DURATIONS = [1, 4, 8, 24, 72, 168]  # hours offered in the UI; Discord allows 1-768


def poll_out(poll: Poll, guild_id: str | None) -> dict:
    return {
        "id": poll.id,
        "topic_id": poll.topic_id,
        "claim_id": poll.claim_id,
        "question": poll.question,
        "options": poll.options,
        "duration_hours": poll.duration_hours,
        "allow_multiselect": poll.allow_multiselect,
        "created_by": poll.created_by,
        "status": poll.status,
        "results": poll.results or [{"text": o, "votes": 0} for o in poll.options],
        "decision_claim_id": poll.decision_claim_id,
        "discord_url": discord_api.message_link(guild_id, poll.channel_id, poll.discord_message_id)
        if poll.discord_message_id else None,
        "created_at": poll.created_at.isoformat(),
    }


def validate(question: str, options: list[str], duration_hours: int) -> tuple[str, list[str]]:
    question = " ".join(question.split())
    options = [" ".join(o.split()) for o in options if o and o.strip()]
    if not question:
        raise ValueError("Write a question.")
    if len(question) > 300:
        raise ValueError("Questions can be at most 300 characters.")
    if not 2 <= len(options) <= 10:
        raise ValueError("A poll needs 2 to 10 options.")
    if any(len(o) > 55 for o in options):
        raise ValueError("Each option can be at most 55 characters.")
    if len({o.casefold() for o in options}) != len(options):
        raise ValueError("Options must be different from each other.")
    if not 1 <= duration_hours <= 768:
        raise ValueError("Duration must be between 1 hour and 32 days.")
    return question, options


def create_poll(db: Session, channel_id: str, question: str, options: list[str], duration_hours: int,
                allow_multiselect: bool, topic_id: str | None, claim_id: str | None,
                created_by: str | None) -> Poll:
    question, options = validate(question, options, duration_hours)
    topic = db.get(Topic, topic_id) if topic_id else None
    if topic_id and (topic is None or topic.channel_id != channel_id):
        raise ValueError("That conversation isn't in this channel.")

    intro_bits = ["📊 **Accord poll**"]
    if topic:
        intro_bits.append(f"about *{topic.title}*")
    if created_by:
        intro_bits.append(f"from {created_by}")
    message = discord_api.send_poll(channel_id, question, options, duration_hours, allow_multiselect,
                                    intro=" ".join(intro_bits))

    poll = Poll(
        channel_id=channel_id, topic_id=topic_id, claim_id=claim_id, question=question, options=options,
        duration_hours=duration_hours, allow_multiselect=allow_multiselect, created_by=created_by,
        discord_message_id=str(message.get("id")) if message.get("id") else None,
        results=[{"text": o, "votes": 0} for o in options],
    )
    db.add(poll)
    db.commit()
    db.refresh(poll)
    return poll


def apply_results(db: Session, poll: Poll, answers: list[dict], counts: dict[int, int], finalized: bool) -> Poll:
    """answers: Discord's [{answer_id, poll_media:{text}}]; counts: answer_id -> votes."""
    poll.results = [{"text": a.get("poll_media", {}).get("text", ""), "votes": counts.get(a.get("answer_id"), 0)}
                    for a in answers] or poll.results
    if finalized and poll.status != "closed":
        poll.status = "closed"
        votes = [r["votes"] for r in poll.results]
        top = max(votes) if votes else 0
        winners = [r for r in poll.results if r["votes"] == top]
        if top > 0 and len(winners) == 1 and poll.topic_id:
            summary = ", ".join(f"{r['text']} {r['votes']}" for r in poll.results)
            claim = Claim(
                topic_id=poll.topic_id, kind="decision", origin="poll", verified=True, confidence=100,
                text=f"{winners[0]['text']} (decided by poll: {summary})",
                source_message_ids=[poll.discord_message_id] if poll.discord_message_id else [],
            )
            db.add(claim)
            db.flush()
            poll.decision_claim_id = claim.id
            # a poll on an existing decision replaces it
            if poll.claim_id:
                old = db.get(Claim, poll.claim_id)
                if old is not None and old.kind == "decision" and old.id != claim.id:
                    old.superseded_by_id = claim.id
    db.commit()
    if poll.topic_id and (topic := db.get(Topic, poll.topic_id)) is not None:
        refresh_topic_state(topic, db)
    return poll


def sync_poll(db: Session, poll: Poll) -> Poll:
    """Reads live vote counts from Discord; closes the poll and records the decision when it ends."""
    if not poll.discord_message_id or poll.status == "closed":
        return poll
    message = discord_api.get_message(poll.channel_id, poll.discord_message_id)
    data = message.get("poll") or {}
    results = data.get("results") or {}
    counts = {c.get("id"): c.get("count", 0) for c in results.get("answer_counts", [])}
    return apply_results(db, poll, data.get("answers", []), counts, bool(results.get("is_finalized")))


def end_poll(db: Session, poll: Poll) -> Poll:
    """Ends the poll in Discord now (instead of waiting an hour) and records the winner."""
    if poll.status == "closed":
        return poll
    if not poll.discord_message_id:
        raise ValueError("This poll was never published in Discord")
    message = discord_api.end_poll(poll.channel_id, poll.discord_message_id)
    data = message.get("poll") or {}
    results = data.get("results") or {}
    counts = {c.get("id"): c.get("count", 0) for c in results.get("answer_counts", [])}
    return apply_results(db, poll, data.get("answers", []), counts, True)


def guild_for(db: Session, channel_id: str) -> str | None:
    info = db.get(ChannelInfo, channel_id)
    if info and info.guild_id:
        return info.guild_id
    topic = db.query(Topic).filter(Topic.channel_id == channel_id).first()
    return topic.guild_id if topic else None
