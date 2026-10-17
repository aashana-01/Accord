
from app.db import SessionLocal
from app.models import Claim, Message, Topic, utc_now

DEMO_TOPIC_ID = "demo-topic-001"
MESSAGE_ONE_ID = "111111111111111111"
MESSAGE_TWO_ID = "222222222222222222"


def seed_database():
    db = SessionLocal()

    try:
        existing_topic = (
            db.query(Topic)
            .filter(Topic.id == DEMO_TOPIC_ID)
            .first()
        )

        if existing_topic:
            print("Demo data already exists.")
            return

        now = utc_now()

        topic = Topic(
            id=DEMO_TOPIC_ID,
            title="Should we add anonymous voting?",
            summary="The team is discussing anonymous polls.",
            content_status="Debating",
            lifecycle_status="Active",
            guild_id="demo-guild",
            channel_id="demo-channel",
            message_count=2,
            created_at=now,
            last_activity=now,
        )

        message_one = Message(
            id=MESSAGE_ONE_ID,
            topic_id=DEMO_TOPIC_ID,
            guild_id="demo-guild",
            channel_id="demo-channel",
            author_id="demo-user-1",
            author_name="Alex",
            content="Anonymous voting might help people share honest opinions.",
            timestamp=now,
        )

        message_two = Message(
            id=MESSAGE_TWO_ID,
            topic_id=DEMO_TOPIC_ID,
            guild_id="demo-guild",
            channel_id="demo-channel",
            author_id="demo-user-2",
            author_name="Jordan",
            content="We should also discuss whether anonymous votes reduce accountability.",
            timestamp=now,
        )

        claim = Claim(
            id="demo-claim-001",
            topic_id=DEMO_TOPIC_ID,
            kind="support",
            text="Anonymous voting may encourage honest feedback.",
            source_message_ids=[MESSAGE_ONE_ID],
            verified=True,
            created_at=now,
        )

        db.add_all([topic, message_one, message_two, claim])
        db.commit()

        print("Demo topic, messages, and claim created.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
