# Project memory, Chat and Discord alerts

Three things that connect a Dockyard project to the bots that work on it.

## Project memory (the Memory tab)

Each project keeps a short memory: **rules**, **decisions** and **facts** the project's bots
should know. Open a project, then **Memory**.

- Add an entry: pick Rule, Decision or Fact, write it (up to 500 characters), **Add to memory**.
- **Edit** keeps the old wording as history (**History** shows every version).
- **Archive** hides an entry from the bots; **Show archived** and **Restore** bring it back as it
  was. Nothing is ever deleted.
- **What bots see** shows the exact text a bot is given: rules first, then decisions, then facts,
  newest first, at most 2,000 characters (it says how many entries were left out).
- **From finished work** offers results of finished work on the project's board as a starting
  point; **Use this** fills the form, and nothing is added until you press Add.

Only the project owner can change the memory: rules become instructions to bots.

**When a bot gets it.** A bot gets the project's memory on every turn when:

- it is a Kanban worker on one of the project's tasks (the project's board), or
- it is in a Desktop chat opened from Dockyard's **Chat** menu (below).

It is added to that turn only and is not saved in the chat. The bot's own memory, and whichever
memory provider it uses, are not touched.

**Switch it on for each bot.** Hermes plugins are opt-in per profile, so a bot only gets project
memory if Dockyard's Python plugin is enabled in that bot's profile:

```bash
hermes -p <bot> plugins enable hermes-project-stewardship
```

A bot in another profile reads Dockyard's data where Dockyard runs (normally the root profile).
Set `STEWARD_DB_PATH` to point bots somewhere else.

## Chat with a project's bots

On a project's header, **Chat** lists the project's team, lead first. Picking a bot opens a fresh
Hermes Desktop chat with it, in your normal chat list. Its first message brings the project's
memory, and so does every later message in that chat.

How the chat knows its project: Dockyard records a one-time link for that bot (valid for ten
minutes) and the first message of a new Desktop chat with that bot takes it. If you open a second
new chat with the same bot and type there first, that chat takes the link instead. The memory
names the project, so you can tell.

## Discord alerts

Dockyard can post new alerts to a Discord channel, through the Discord bot Hermes already uses.

1. **Choose what goes out.** App settings, Notification settings: **Discord alerts** On, and a
   **Discord minimum severity** (default: high). Quiet hours hold alerts until they end, except
   approvals. Each alert is posted once, if it is still new and under 24 hours old.
2. **Set up the job that posts them.** Nothing is sent until this exists. Create a script:

   ```bash
   cat > ~/.hermes/scripts/dockyard-discord-alerts.sh <<'EOF'
   #!/usr/bin/env bash
   # Prints the alerts due for Discord as one message, or nothing.
   DB="$HOME/.hermes/plugin-data/hermes-dockyard/dockyard.db"
   [ -f "$DB" ] || exit 0   # never create the database
   exec stewardctl --db "$DB" notifications discord-due --mark
   EOF
   chmod +x ~/.hermes/scripts/dockyard-discord-alerts.sh
   ```

   Then schedule it as a no-AI job (no model is ever called):

   ```bash
   hermes cron create "* * * * *" --no-agent \
     --script dockyard-discord-alerts.sh \
     --deliver discord:<channel id> \
     --name dockyard-discord-alerts
   hermes cron run <job id>   # one test run
   ```

   When nothing is due the script prints nothing and Hermes posts nothing.

**What a message looks like.** One line per alert, oldest first: severity, project and title,
under Discord's 2,000-character limit ("...and N more in Dockyard" when it is cut). Mentions in
titles cannot ping anyone and Markdown in titles cannot restyle the message.

**Limit.** An alert is marked sent when the job prints it. If the Discord post itself fails, that
alert is not retried in Discord; it is still in Dockyard's Notifications.

To see what would be posted without marking anything: `stewardctl --db <db> notifications
discord-due` (no `--mark`).
