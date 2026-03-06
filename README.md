# Accord Server MCP

MCP (Model Context Protocol) server integration for connecting AI agents to an [Accord](https://github.com/DaccordProject/accordserver) chat server instance. Includes client configuration for major AI coding tools and a standalone CLI client.

## Prerequisites

- An Accord server running with `MCP_API_KEY` set
- The server's base URL (e.g. `http://localhost:39099`)

## Agent Setup

Accord exposes a streamable HTTP MCP endpoint at `/mcp`. The examples below assume your server is at `http://localhost:39099` -- replace with your actual URL and API key.

### Claude Code

Add a `.mcp.json` file to your project root (or `~/.claude/.mcp.json` for global config):

```json
{
  "mcpServers": {
    "accord": {
      "type": "streamable-http",
      "url": "http://localhost:39099/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

Or add it interactively:

```bash
claude mcp add accord --transport streamable-http http://localhost:39099/mcp \
  -h "Authorization: Bearer YOUR_MCP_API_KEY"
```

### Codex (OpenAI)

Create or edit `codex.json` in your project root (or `~/.codex/codex.json` for global):

```json
{
  "mcpServers": {
    "accord": {
      "type": "streamable-http",
      "url": "http://localhost:39099/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

### OpenCode

Add to your `opencode.json` (project root or `~/.config/opencode/config.json`):

```json
{
  "mcp": {
    "accord": {
      "type": "streamable-http",
      "url": "http://localhost:39099/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

### Claude Desktop

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "accord": {
      "type": "streamable-http",
      "url": "http://localhost:39099/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

### Any MCP-compatible client

The server speaks standard MCP over streamable HTTP. Point any client at:

- **URL**: `http://your-server:39099/mcp`
- **Auth header**: `Authorization: Bearer <YOUR_MCP_API_KEY>`
- **Transport**: Streamable HTTP (POST)
- **Protocol version**: `2025-03-26`

## Standalone CLI Client

A built-in interactive client is included for testing or scripting.

### Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/DaccordProject/accordserver-mcp/main/install.sh | bash
```

### Install & run (manual)

```bash
npm install
npm run build
npm start
```

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ACCORD_MCP_URL` | MCP endpoint URL | `http://localhost:39099/mcp` |
| `ACCORD_MCP_API_KEY` | MCP API key (required) | -- |

### Example session

```
$ export ACCORD_MCP_API_KEY="your-key"
$ npm start

Connecting to http://localhost:39099/mcp...
Connected. Type 'help' for commands.

accord> info
accord> spaces
accord> channels abc123
accord> messages def456 10
accord> send def456 Hello from the CLI!
accord> exit
```

### CLI commands

| Command | Description |
|---------|-------------|
| `info` | Server info and stats |
| `spaces` | List all spaces |
| `space <id>` | Space details |
| `channels <space_id>` | List channels in a space |
| `members <space_id> [limit]` | List space members |
| `user <user_id>` | User details |
| `messages <channel_id> [limit]` | Recent messages |
| `search <space_id> <query>` | Search messages |
| `send <channel_id> <message>` | Send a message |
| `create-channel <space_id> <name> [topic]` | Create a channel |
| `delete-channel <channel_id>` | Delete a channel |
| `delete-message <message_id>` | Delete a message |
| `kick <space_id> <user_id>` | Kick a member |
| `ban <space_id> <user_id> [reason]` | Ban a user |
| `unban <space_id> <user_id>` | Unban a user |
| `tools` | List all MCP tools |
| `call <tool> [json_args]` | Call any tool directly |
| `help` | Show help |
| `exit` | Quit |

## Available Tools

### Read Operations

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `server_info` | Server version, space count, online users, voice status | _(none)_ |
| `list_spaces` | List all spaces on the server | _(none)_ |
| `get_space` | Get details about a specific space | `space_id` |
| `list_channels` | List channels in a space | `space_id` |
| `list_members` | List members of a space | `space_id`, optional `limit` |
| `get_user` | Get user info by ID | `user_id` |
| `list_messages` | List recent messages in a channel | `channel_id`, optional `limit`, `after` |
| `search_messages` | Search messages in a space | `space_id`, optional `query`, `author_id`, `channel_id`, `limit` |

### Write Operations

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `send_message` | Send a message to a channel | `channel_id`, `content`, optional `reply_to` |
| `create_channel` | Create a channel in a space | `space_id`, `name`, optional `channel_type`, `topic` |
| `delete_channel` | Delete a channel | `channel_id` |
| `delete_message` | Delete a message | `message_id` |

### Moderation

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `kick_member` | Remove a member from a space | `space_id`, `user_id` |
| `ban_user` | Ban a user from a space | `space_id`, `user_id`, optional `reason` |
| `unban_user` | Remove a ban | `space_id`, `user_id` |

## Protocol Details

- **Transport**: Streamable HTTP (POST)
- **Endpoint**: `POST /mcp`
- **Auth**: `Authorization: Bearer <MCP_API_KEY>`
- **Protocol version**: `2025-03-26`
- **Format**: JSON-RPC 2.0

## Security Notes

- The MCP API key grants full administrative access to the server (read all messages, send as system, kick/ban users)
- Treat it like a root credential -- do not expose it in client-side code or logs
- The endpoint is disabled entirely unless `MCP_API_KEY` is set on the server
- Key comparison uses constant-time equality to prevent timing attacks
- Messages sent via MCP are attributed to author `"mcp"` for auditability
