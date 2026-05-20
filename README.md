# Claude Trello — Claude Desktop Extension

A Claude Desktop Extension that connects Claude to [Trello](https://trello.com), letting you view boards, manage cards, move tasks, and add comments directly from Claude.

## Requirements

- **Node.js v18 or later** must be installed on your machine. The extension runs a local Node.js server — Claude Desktop does not bundle a Node runtime.
  - Download from [nodejs.org](https://nodejs.org) (choose the LTS version)
  - To check if you already have it: open a terminal and run `node --version`

## Installation

### Claude Desktop (macOS and Windows)

1. Download `claude-trello.mcpb` from the [latest release](../../releases/latest)
2. Go to [claude.ai/settings](https://claude.ai/settings) → **Extensions**
3. Click **Add Extension** and select the downloaded `.mcpb` file
4. Enter your Trello credentials when prompted (see below)

> **Security prompt:** During installation, Claude will warn that "developer information has not been verified by Anthropic." This is shown for all third-party extensions — Anthropic doesn't yet offer a developer verification programme. You can review the full source in this repository.

### Claude CLI / Linux

1. Install the MCP server: `npm install -g atlassian-trello-mcp`
2. Add the following to your Claude CLI MCP config (`~/.claude/settings.json` → `mcpServers`):

```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "atlassian-trello-mcp"],
      "env": {
        "TRELLO_API_KEY": "your_api_key",
        "TRELLO_TOKEN": "your_token"
      }
    }
  }
}
```

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
