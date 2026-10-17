import os
import discord
from discord import app_commands
from dotenv import load_dotenv

from app.db import Base, engine, SessionLocal
from app.models import Topic, Message

load_dotenv()

TOKEN = os.getenv("DISCORD_BOT_TOKEN")

# Make sure the existing database tables are initialized.
Base.metadata.create_all(bind=engine)

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
            if not message.author.bot
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

    # Save the imported conversation using the existing SQLAlchemy models.
    db = SessionLocal()

    try:
        topic = Topic(
            title=f"Import from #{channel.name}",
            summary="Recent Discord messages imported by Accord.",
            content_status="Open",
            lifecycle_status="Active",
            guild_id=str(interaction.guild.id),
            channel_id=str(channel.id),
            message_count=len(discord_messages),
        )

        db.add(topic)
        db.flush()  # Assign the topic its database ID.

        for discord_message in discord_messages:
            saved_message = Message(
                id=str(discord_message.id),
                topic_id=topic.id,
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
            )
            db.add(saved_message)

        db.commit()
        topic_id = topic.id

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    await interaction.followup.send(
        f"**Accord import complete!**\n"
        f"- Channel: {channel.mention}\n"
        f"- Messages imported: {len(discord_messages)}\n"
        f"- Topic ID: `{topic_id}`\n\n"
        "These messages are saved. AI claim extraction is the next step.",
        ephemeral=True,
    )


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
