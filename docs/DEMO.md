# Accord: full demo script (MACS-HACKS, Sunday noon)

15 minutes total: about 2 min pitch, 10 min live demo, 3 min wrap-up and questions.
**Rule for the demo:** everything shown is real. Real Discord messages, real polls, real pings, local AI.

---

## Part 1: Setup (do this by 10:30 AM)

**Code**
1. `cd ~/Accord && git pull`
2. Apply the patch:
   - Already applied steps 1–3: `git apply --3way /mnt/c/Users/prlal/Downloads/accord-ui-steps4-6.patch`
   - Haven't applied anything yet: `git apply --3way /mnt/c/Users/prlal/Downloads/accord-ui-full.patch`
3. `cd frontend && npm install` (adds html-to-image for Download)
4. In `backend/.env` add: `DORMANT_AFTER_SECONDS=120`
5. Make sure Ollama is running (`ollama list` shows your model).
6. Restart the backend, the bot and the frontend.

**Discord**
- Developer Portal → bot → give it **Send Polls**, **Send Messages**, **Read Message History**. Re-invite if needed.
- Create a fresh channel: **#demo-day**.
- Projector laptop: be logged into Discord + have the map open in a browser tab, zoomed to 110%.

**Warm-up (makes the AI instant on stage, everything gets cached)**
After posting the chat (Part 2) and running `/accord`:
- Translation → Français, wait until "Translating…" disappears. Then العربية. Then back to English.
- Ask the chatbot the 3 questions from Step 6 once.
- Download the PDF once to check it works.

---

## Part 2: The chat (post at least 5 minutes before you present)

Three of you post these in **#demo-day**, in order, from your own accounts.
Use Discord's **Reply** where it says *(reply to N)*. Then run `/accord limit:100`.

| # | Who | Message |
|---|---|---|
| 1 | Pearl | ok what are we naming the project? |
| 2 | Shriya | anyone down for valorant after the hackathon |
| 3 | Aashana | for the backend let's just use Node |
| 4 | Pearl | should the demo be in dark mode or light mode on the projector? |
| 5 | Aashana | ThreadSense? since it makes sense of threads *(reply to 1)* |
| 6 | Shriya | dark mode looks way cooler on stage *(reply to 4)* |
| 7 | Pearl | ok locking it in, Node for the backend *(reply to 3)* |
| 8 | Aashana | light mode is easier to read on projectors though, dark gets washed out *(reply to 4)* |
| 9 | Shriya | ThreadSense sounds like a sewing app lol *(reply to 5)* |
| 10 | Pearl | what about Accord? like reaching an accord *(reply to 1)* |
| 11 | Shriya | what are we getting for lunch tomorrow? |
| 12 | Aashana | Accord is good *(reply to 10)* |
| 13 | Pearl | final answer: the name is Accord. everyone agree? |
| 14 | Aashana | agreed *(reply to 13)* |
| 15 | Shriya | agreed *(reply to 13)* |
| 16 | Aashana | pizza, it's cheap and fast *(reply to 11)* |
| 17 | Aashana | wait, sentence-transformers is python only, we should switch the backend to FastAPI *(reply to 7)* |
| 18 | Pearl | shawarma is better, pizza every hackathon is sad *(reply to 11)* |
| 19 | Pearl | true, ok we're going with FastAPI instead of Node *(reply to 17)* |
| 20 | Shriya | valorant at 11 then? *(reply to 2)* |
| 21 | Aashana | agreed, FastAPI *(reply to 19)* |
| 22 | Pearl | we still need someone to make the slides before noon |
| 23 | Shriya | who's recording the backup demo video in case the wifi dies? *(reply to 22)* |
| 24 | Aashana | I can do the slides, need the screenshots by 10 though *(reply to 22)* |
| 25 | Shriya | gg you're going down tonight *(reply to 20)* |
| 26 | Pearl | do we have to pay for the AI part? *(reply to 21)* |
| 27 | Shriya | no, Ollama runs locally so it's free *(reply to 26)* |

**Check the map shows:**
| Conversation | What you should see |
|---|---|
| Project name | Decided: Accord. ThreadSense as a proposal + "sewing app" objection |
| Backend | Decided: FastAPI. "Node" crossed out as *Replaced*. "Do we have to pay?" *Answered* by #27 |
| Demo theme | Argument: dark (for) vs light (against). Debating |
| Lunch | Debating: pizza vs shawarma |
| Demo prep | Open: backup video question, slides offer |
| Valorant | Off-topic |

If the AI groups something differently, that's fine. Adjust what you say, not the data.

---

## Part 3: Run of show (who does what)

Suggested roles: **Pearl** drives the laptop and talks, **Aashana** and **Shriya** vote, reply and get pinged from their phones or laptops.

### 0:00 Pitch (2 min)
> "Discord is where teams make decisions, but decisions get buried. Five topics at once, replies everywhere,
> someone joins late and has to scroll 300 messages to find out what was decided.
> We reinvented the wheel: Discord is the same, but **Accord** turns a channel into a living mind map.
> It splits the chat into conversations, finds the decisions, arguments and questions,
> and lets you act on them with polls and tasks, all with a local AI, so no data leaves your machine."

Show **#demo-day** in Discord. Scroll it: "Here's a normal messy chat. Four topics interleaved."

### 2:00 Step 1: `/accord` → the map (1.5 min)
- Run `/accord` (or show the bot's reply) → click **Open the mind map**.
- "27 messages became 6 conversations. Each box tells you its **activity**, **status** and **type** at a glance."
- Point at **Valorant**: "It even knows what's off-topic."

### 3:30 Step 2: Zoom into conversations (1.5 min)
- Click **Backend**: "The team said Node, then changed their mind. Accord shows the old decision crossed out
  and the new one: FastAPI. And the question 'do we have to pay for the AI?' is answered, linked to the message."
- Esc. Click **Demo theme**: "Arguments get split into for and against."
- Esc. **Keyboard only:** press Tab to a box, Enter to open, Esc to go back. "Everything works without a mouse."

### 5:00 Step 3: Accessibility (1 min)
- **MindMap ▾ → List view:** "Mind maps are visual, so we built a screen-reader version: same data, real headings and lists."
- **Mode ▾ → Light:** "Light and dark themes, both checked for WCAG contrast. It follows your computer by default."
  (Stay in whichever looks best on the projector.)
- MindMap ▾ → Map view.

### 6:00 Step 4: Translation (1 min)
- **Translation ▾ → Français:** "Teams are international. The whole page translates, including the messages,
  using the local AI. The original messages are never changed."
- **Translation ▾ → العربية:** "Right-to-left languages flip the layout."
- Back to **English**.

### 7:00 Step 5: Poll (2 min)
- **Poll** → About: *Demo theme* → Question "Dark or light mode for the demo?" → Options **Dark**, **Light**
  → 1 hour → Post as: Me (Pearl) → **Publish poll in Discord**.
- Switch to Discord: "It's a real native Discord poll." Aashana + Shriya vote (e.g. both Light).
- Back to the map → **Poll** → **End poll now** → **Yes, end it now**.
- Click **Show on map**: "The winner is now the official decision, tagged *Decided by poll* with the vote count.
  The conversation flips from Debating to Decided."

### 9:00 Step 6: Actions (1.5 min)
- **Actions** → Task "Make the slides" → Linked to: *Demo prep* → Message: Aashana's #24 → Assign to **Aashana**
  → Due: today → **Create task**.
- Aashana shows her screen or phone: the bot **pinged her in Discord, replying to her own message**.
- Change status to **In progress**: "Status changes don't spam anyone. Only assigning pings."
- Point at the Demo prep box: "Tasks show up right on the map."

### 10:30 Step 7: Chatbot (1.5 min)
- Click **Ask Accord** (bottom right). Ask:
  1. "What did we decide for the backend?"
  2. "Who is doing the slides?"
  3. "Which questions are still open?"
- "Every answer cites its sources. Click a number and it jumps to that spot on the map.
  It only answers from this chat. If it doesn't know, it says so."
- Click a **source number** → the map zooms there.

### 12:00 Step 8: It's live (1 min)
- **Reopened:** in Discord, reply to #11: "actually can we do lunch at 1 instead?" → `/accord` → refresh map.
  "Lunch was Dormant. Someone came back to it, so it's now **Reopened**."
- **Edits sync:** edit #16 to "wings, pizza is boring" → `/accord` → refresh. "Edits and deletes update the map."

### 13:00 Step 9: Download (30 s)
- **Download ▾ → Full report (PDF):** "One click gives a report for people who weren't there: the map and every decision."
  Open the PDF.

### 13:30 Wrap-up + what we measured (1.5 min)
> "What we changed, and how we can measure it:"
- **27 messages → 6 conversations**, 3 decisions, 1 replaced decision, 1 answered question, found automatically.
- **Finding a decision:** scrolling Discord vs **1 click** on the map. *(Time both live if you have a minute.)*
- **From talk to action:** poll → official decision, and decision → assigned task, without leaving the map.
- **Accessible:** keyboard-only, screen-reader list view, WCAG AA contrast, 9 languages including right-to-left.
- **Private and free:** local Ollama, results cached, so re-runs are instant.

> "Discord didn't change. How you see it did. That's Accord."

---

## Backup plan
| If… | Then… |
|---|---|
| Ollama is slow | You warmed up the cache. Same questions and languages come back instantly. Don't ask new chatbot questions on stage. |
| Wi-Fi dies | The map still works locally. Show the downloaded PDF + screenshots. |
| A poll won't publish | The bot is missing **Send Polls**. Show the existing poll instead. |
| The bot doesn't reply | Restart the bot terminal, run `/accord` again. |
| The AI grouped something oddly | Say: "it's AI, and that's why you can see the source messages behind every point." |

## Likely judge questions
- **Why not just use threads?** People don't use them. Accord works on the chat people actually have.
- **Is my data sent anywhere?** No, the AI runs locally with Ollama.
- **What if the AI is wrong?** Every point links to its source messages. Low-confidence points are marked *Not sure*.
- **Does it scale?** Results are cached per message set. Only new or edited messages trigger new AI work.
