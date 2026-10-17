import asyncio
import os
from urllib.parse import quote
import discord
from discord import app_commands
from dotenv import load_dotenv

from app.db import Base, engine, SessionLocal
from app.models import Message
from app.migrations import ensure_columns
from app.bot.message_sync import apply_delete, apply_edit, is_human
from app.services.pipeline import analyze_channel

load_dotenv()

TOKEN = os.getenv("DISCORD_BOT_TOKEN")
# Where the mind map runs (the frontend dev server for now)
MAP_URL = os.getenv("ACCORD_MAP_URL", "http://localhost:5173")

# Make sure the existing database tables are initialized.
Base.metadata.create_all(bind=engine)
ensure_columns()

intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)
tree = app_commands.CommandTree(client)


@tree.command(
    name="accord",
    description="Import recent messages from this channel into Accord",
)
@app_commands.describe(
    limit="Number of recent messages to import (1-100)"
)
async def accord(
    interaction: discord.Interaction,
    limit: app_commands.Range[int, 1, 100] = 50,
):
    # Only import from a server channel.
    if interaction.guild is None or interaction.channel is None:
        await interaction.response.send_message(
            "Please use Accord inside a server channel.",
            ephemeral=True,
        )
        return

    await interaction.response.defer(ephemeral=True, thinking=True)

    channel = interaction.channel

    # Fetch recent messages, oldest first.
    try:
        discord_messages = [
            message
            async for message in channel.history(
                limit=limit,
                oldest_first=True,
            )
            if is_human(message.author)
        ]
    except (discord.Forbidden, discord.HTTPException):
        await interaction.followup.send(
            "I couldn't read this channel. Check my channel permissions.",
            ephemeral=True,
        )
        return

    if not discord_messages:
        await interaction.followup.send(
            "No messages from human users were found.",
            ephemeral=True,
        )
        return

    # Save only messages we haven't seen before. Re-running /accord is safe
    # (no duplicate-ID crash) and only new messages are added.
    db = SessionLocal()

    try:
        incoming_ids = [str(m.id) for m in discord_messages]
        known_ids = {
            row[0]
            for row in db.query(Message.id).filter(Message.id.in_(incoming_ids)).all()
        }
        new_messages = [m for m in discord_messages if str(m.id) not in known_ids]

        for discord_message in new_messages:
            db.add(Message(
                id=str(discord_message.id),
                topic_id=None,  # the AI assigns a conversation in the next step
                guild_id=str(interaction.guild.id),
                channel_id=str(channel.id),
                author_id=str(discord_message.author.id),
                author_name=discord_message.author.display_name,
                content=discord_message.content,
                timestamp=discord_message.created_at,
                reply_to_id=(
                    str(discord_message.reference.message_id)
                    if discord_message.reference
                    and discord_message.reference.message_id
                    else None
                ),
            ))

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    # Split into conversations, name them, extract claims (slow AI work runs off the event loop).
    def run_analysis():
        session = SessionLocal()
        try:
            return analyze_channel(str(channel.id), session, str(interaction.guild.id))
        finally:
            session.close()

    result = await asyncio.to_thread(run_analysis)
    titles = "\n".join(f"- {t['title']}" for t in result["topics"]) or "- (none)"

    if result["conversations"] < 2:
        note = "One conversation is not sufficient for a mind map execution."
    else:
        note = f"Mind map is ready: {MAP_URL}/?channel={channel.id}&name={quote(channel.name)}"
    if result["errors"]:
        note += f"\n⚠️ {len(result['errors'])} step(s) failed; check the backend terminal."
        for error in result["errors"]:
            print(f"Accord analysis error: {error}")

    await interaction.followup.send(
        f"**Accord analysis complete!**\n"
        f"- Channel: {channel.mention}\n"
        f"- New messages: {len(new_messages)} (skipped {len(known_ids)} already saved)\n"
        f"- Conversations found: {result['conversations']}\n{titles}\n\n{note}",
        ephemeral=True,
    )


@client.event
async def on_raw_message_edit(payload: discord.RawMessageUpdateEvent):
    content = payload.data.get("content")
    author = payload.data.get("author") or {}
    if content is None or author.get("bot"):
        return
    db = SessionLocal()
    try:
        apply_edit(db, str(payload.message_id), content)
    finally:
        db.close()


@client.event
async def on_raw_message_delete(payload: discord.RawMessageDeleteEvent):
    db = SessionLocal()
    try:
        apply_delete(db, str(payload.message_id))
    finally:
        db.close()


@client.event
async def on_ready():
    await tree.sync()
    print(f"Accord bot logged in as {client.user}")


if __name__ == "__main__":
    if not TOKEN:
        raise RuntimeError(
            "DISCORD_BOT_TOKEN is missing from backend/.env"
        )

    client.run(TOKEN)
