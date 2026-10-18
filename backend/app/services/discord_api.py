"""Talks to Discord's REST API with the bot token, so the web page can publish polls and
task notices without going through the bot process."""
import os

API = "https://discord.com/api/v10"


class DiscordError(RuntimeError):
    pass


def _token() -> str:
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        raise DiscordError("DISCORD_BOT_TOKEN is missing from backend/.env")
    return token


def _request(method: str, path: str, json: dict | None = None) -> dict:
    import httpx  # imported lazily so tests and offline use don't need it

    resp = httpx.request(
        method,
        f"{API}{path}",
        json=json,
        headers={"Authorization": f"Bot {_token()}"},
        timeout=15,
    )
    if resp.status_code >= 400:
        raise DiscordError(f"Discord said {resp.status_code}: {resp.text[:300]}")
    return resp.json() if resp.content else {}


def message_link(guild_id: str | None, channel_id: str, message_id: str) -> str:
    return f"https://discord.com/channels/{guild_id or '@me'}/{channel_id}/{message_id}"


def send_message(channel_id: str, content: str, mention_user_ids: list[str] | None = None,
                 reply_to: str | None = None) -> dict:
    body: dict = {"content": content[:2000], "allowed_mentions": {"users": mention_user_ids or []}}
    if reply_to:
        body["message_reference"] = {"message_id": reply_to, "fail_if_not_exists": False}
    return _request("POST", f"/channels/{channel_id}/messages", body)


def send_poll(channel_id: str, question: str, answers: list[str], duration_hours: int,
              allow_multiselect: bool, intro: str | None = None) -> dict:
    """Posts a native Discord poll. The bot needs the Send Polls permission."""
    body = {
        "poll": {
            "question": {"text": question[:300]},
            "answers": [{"poll_media": {"text": a[:55]}} for a in answers],
            "duration": max(1, min(768, duration_hours)),
            "allow_multiselect": allow_multiselect,
            "layout_type": 1,
        },
        "allowed_mentions": {"parse": []},
    }
    if intro:
        body["content"] = intro[:2000]
    return _request("POST", f"/channels/{channel_id}/messages", body)


def end_poll(channel_id: str, message_id: str) -> dict:
    """Ends a poll the bot posted, right now. Only the poll's author can do this."""
    return _request("POST", f"/channels/{channel_id}/polls/{message_id}/expire")


def get_message(channel_id: str, message_id: str) -> dict:
    return _request("GET", f"/channels/{channel_id}/messages/{message_id}")
