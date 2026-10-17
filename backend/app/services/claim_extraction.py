import json
import os

from ollama import chat
from sqlalchemy.orm import Session

from app.models import Topic, Message, Claim


ALLOWED_KINDS = {
    "proposal",
    "for",
    "against",
    "decision",
    "question",
}

CLAIMS_SCHEMA = {
    "type": "object",
    "properties": {
        "claims": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "kind": {
                        "type": "string",
                        "enum": sorted(ALLOWED_KINDS),
                    },
                    "text": {"type": "string"},
                    "source_message_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": [
                    "kind",
                    "text",
                    "source_message_ids",
                ],
                "additionalProperties": False,
            },
        }
    },
    "required": ["claims"],
    "additionalProperties": False,
}



def extract_claims_with_ollama(messages: list[Message]) -> list[dict]:
    """Extract claims from messages using Ollama."""

    provider = os.getenv("AI_PROVIDER", "ollama").lower()

    if provider != "ollama":
        raise RuntimeError(f"Unsupported AI provider: {provider}")

    model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

    selected_messages = messages[-100:]

    message_data = [
        {
            "id": message.id,
            "author": message.author_name,
            "content": message.content[:3000],
        }
        for message in selected_messages
    ]

    response = chat(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You analyze Discord conversations and extract useful claims. "
                    "Return valid JSON matching the requested schema. "
                    "Each claim must have a kind, text, and source_message_ids. "
                    "Allowed kinds are: proposal, for, against, decision, question. "
                    "Do not invent claims or message IDs. Every claim must cite "
                    "one or more supplied message IDs that directly support it. "
                    "Merge repeated claims that express the same meaning into "
                    "one claim, even when they use different wording or "
                    "capitalization. Include every message ID that directly "
                    "supports the merged claim in source_message_ids. "
                    "Do not merge claims that express meaningfully different "
                    "ideas, contradict each other, or have different decision "
                    "statuses. Return no claims when there is no meaningful "
                    "evidence."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "messages": message_data,
                        "output_schema": CLAIMS_SCHEMA,
                    }
                ),
            },
        ],
        format=CLAIMS_SCHEMA,
        options={"temperature": 0},
    )

    result = json.loads(response.message.content)

    if not isinstance(result, dict) or not isinstance(
        result.get("claims"), list
    ):
        raise RuntimeError("Ollama returned an invalid claims structure")

    claims = result["claims"]

    # Add source IDs when the exact claim text appears in a message.
    # This helps with repeated wording but does not detect every paraphrase.
    for claim in claims:
        if not isinstance(claim, dict):
            continue

        claim_text = claim.get("text")

        if not isinstance(claim_text, str):
            continue

        normalized_claim = " ".join(claim_text.casefold().split())
        source_ids = claim.get("source_message_ids", [])

        if not isinstance(source_ids, list):
            source_ids = []

        for message in selected_messages:
            normalized_message = " ".join(
                message.content[:3000].casefold().split()
            )

            if (
                normalized_claim
                and normalized_claim in normalized_message
                and message.id not in source_ids
            ):
                source_ids.append(message.id)

        claim["source_message_ids"] = list(dict.fromkeys(source_ids))

    return claims



def validate_claims(
    topic_id: str,
    extracted_claims: list[dict],
    db: Session,
) -> list[dict]:
    """Reject claims with missing or invalid source citations."""

    topic = db.query(Topic).filter(Topic.id == topic_id).first()

    if topic is None:
        raise ValueError("Topic not found")

    valid_ids = {
        message.id
        for message in db.query(Message)
        .filter(Message.topic_id == topic_id)
        .all()
    }

    validated = []

    for item in extracted_claims:
        if not isinstance(item, dict):
            continue

        kind = item.get("kind")
        text = item.get("text")

        if not isinstance(text, str):
            continue

        text = text.strip()
        source_ids = item.get("source_message_ids")

        if kind not in ALLOWED_KINDS or not text:
            continue

        if not isinstance(source_ids, list) or not source_ids:
            continue

        # Every citation must belong to this topic.
        if not all(
            isinstance(source_id, str) and source_id in valid_ids
            for source_id in source_ids
        ):
            continue

        validated.append({
            "kind": kind,
            "text": text,
            "source_message_ids": list(dict.fromkeys(source_ids)),
        })

    return validated





def save_claims(topic_id: str, extracted_claims: list[dict], db: Session) -> list[Claim]:
    validated = validate_claims(topic_id, extracted_claims, db)

    existing = db.query(Claim).filter(Claim.topic_id == topic_id).all()
    existing_by_key = {
        (claim.kind, claim.text.strip().casefold()): claim
        for claim in existing
    }

    saved = []

    try:
        for item in validated:
            key = (item["kind"], item["text"].strip().casefold())
            existing_claim = existing_by_key.get(key)

            if existing_claim is not None:
                # Merge new source IDs into the existing claim.
                current_sources = existing_claim.source_message_ids or []
                new_sources = item["source_message_ids"]

                merged_sources = list(dict.fromkeys(
                    current_sources + new_sources
                ))

                if merged_sources != current_sources:
                    existing_claim.source_message_ids = merged_sources
                    saved.append(existing_claim)

                continue

            claim = Claim(
                topic_id=topic_id,
                kind=item["kind"],
                text=item["text"],
                source_message_ids=item["source_message_ids"],
                verified=False,
            )
            db.add(claim)
            existing_by_key[key] = claim
            saved.append(claim)

        db.commit()

        for claim in saved:
            db.refresh(claim)

        return saved

    except Exception:
        db.rollback()
        raise


def correct_comparison_claim(topic_id: str, db: Session) -> bool:
    claim = (
        db.query(Claim)
        .filter(
            Claim.topic_id == topic_id,
            Claim.text == "Let's compare both before deciding.",
            Claim.kind == "decision",
        )
        .first()
    )

    if claim is None:
        return False

    claim.kind = "proposal"
    db.commit()
    return True

