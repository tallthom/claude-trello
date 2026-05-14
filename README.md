# Moodle Trello — Claude Desktop Extension

A Claude Desktop Extension that connects Claude to [Trello](https://trello.com), letting you view boards, manage cards, move tasks, and add comments directly from Claude.

## Installation

1. Download `moodle-trello.mcpb` from the [latest release](../../releases/latest)
2. Open the file — Claude Desktop will prompt you to install it
3. Enter your Trello credentials when prompted (see below)

Supported on **macOS** and **Windows**.

> **Security prompt:** During installation, Claude Desktop will warn that "developer information has not been verified by Anthropic." This is shown for all third-party extensions — Anthropic doesn't yet offer a developer verification programme. This extension is built and maintained by the Moodle team; you can review the full source in this repository.

## Getting your Trello credentials

You'll need two things: an **API Key** and a **Token**.

### API Key

1. Log in to [trello.com](https://trello.com)
2. Go to [trello.com/power-ups/admin](https://trello.com/power-ups/admin)
3. Click **New** to create a Power-Up (or select an existing one)
4. Fill in a name (e.g. "Claude Integration") and select your workspace
5. Go to the **API Key** tab — your key is shown there, click to copy it

### Token

1. On the same API Key page, click **Generate a Token**
2. You'll be redirected to an authorisation page — click **Allow**
3. Copy the token shown on the next page

> **Note:** Keep your token private — it grants full access to your Trello account.

## What you can do

Once installed, you can ask Claude things like:

- *"Show me my Trello boards"*
- *"What cards are in the To Do list on my project board?"*
- *"Move the 'Update documentation' card to Done"*
- *"Add a comment to the card 'Review submissions'"*
- *"Create a new card called 'Follow up with partner' in the Training list"*

## Source

Built on top of [atlassian-trello-mcp](https://github.com/agrath/Trello-Desktop-MCP) by [@agrath](https://github.com/agrath).
