# Accord AI pipeline

`/accord` in Discord (or `POST /channels/{channel_id}/analyze`) runs:

1. **Save new messages only.** Skips messages already saved and bot messages, so re-running is safe.
2. **Split + name conversations** (`services/segmentation.py`). The AI groups messages into conversations, names them like chat threads (2-5 words), and marks `kind` (argument/discussion) and `is_off_topic`. Messages the AI skips join what they reply to. **Title stability:** a re-run keeps a topic's id, claims and title while it just grows. It's renamed only if more than 50% of it is new or it lost more than 20% of its messages to other conversations (`RENAME_WHEN_NEW_SHARE_ABOVE`, `RENAME_WHEN_LOST_SHARE_ABOVE`).
3. **Extract claims** (`claim_extraction.py`). Clearer rules: a decision needs explicit agreement (likes alone count as "for"); claims are short and neutral; message text is treated as data, never instructions. A made-up message id is dropped instead of throwing away the whole claim. `prune_invalid_sources` removes citations to messages that moved to another conversation or were deleted.
4. **Merge near-duplicates** (`claim_review.merge_near_duplicates`): same kind plus ~85% similar wording gives one claim with all its sources. No AI.
5. **Link answers** (`question_answer_linking.py`). The answer must be sent *after* the question. If a rerun no longer finds an answer (e.g. it was edited), the old link is removed and the question goes back to open.
6. **Review** (`claim_review.review_claims`): one AI pass gives every claim a 0-100 confidence (below 60 shows "Not sure") and marks decisions that a later decision replaced (`superseded_by_id`). Only a later decision can replace a decision.
7. **Status + activity** (`services/topic_state.py`, no AI). Decided means a confident, current decision. Activity is Dormant/Reopened after `DORMANT_AFTER_SECONDS` (set 120 for the demo).

**Cache** (`services/ai.py`, `ai_cache` table): every AI response is keyed on its exact input (the database is still updated from it every run) (ids + text). Same input means no AI call, so re-runs are instant and the demo still works if Ollama is down. Editing a message changes the key, so only that conversation re-runs.

**Edits/deletes** (`bot/message_sync.py`): edits update the saved text; deletes remove the message and every claim/answer reference to it (a claim with no sources left is removed).

**Frontend endpoint:** `GET /channels/{channel_id}/view?name=planning` returns `{channel, messages, topics, claims}` in exactly the shape of `frontend/src/types.ts`.

**Old databases:** `migrations.ensure_columns()` adds the new columns on startup.
