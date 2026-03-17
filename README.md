# Accord MCP

MCP (Model Context Protocol) clients for the [Accord](https://github.com/DaccordProject/accordserver) ecosystem. This package provides two distinct MCP clients:

| Client | Connects to | Auth | Scope | Use case |
|--------|------------|------|-------|----------|
| **Server MCP** (`accord-mcp`) | accordserver (port 39099) | Server-wide `MCP_API_KEY` | Full admin | Server automation, bots, data seeding |
| **Client MCP** (`daccord-mcp`) | daccord desktop app (port 39101) | Per-account bearer token | User's permissions + UI control | Personal AI assistant, UI auditing, testing |

## Prerequisites

### Server MCP
- An Accord server running with `MCP_API_KEY` set
- The server's base URL (e.g. `http://localhost:39099`)

### Client MCP
- The daccord desktop app running with Developer Mode enabled
- MCP Server toggled on in App Settings > Developer
- The bearer token from the Developer settings page

## Agent Setup

### Server MCP (accordserver)

Accord exposes a streamable HTTP MCP endpoint at `/mcp`. The examples below assume your server is at `http://localhost:39099` -- replace with your actual URL and API key.

#### Claude Code

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
claude mcp add accord --transport http http://localhost:39099/mcp \
  -H "Authorization: Bearer YOUR_MCP_API_KEY"
```

#### Codex (OpenAI)

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

#### OpenCode

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

#### Claude Desktop

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

### Client MCP (daccord desktop app)

The daccord desktop app exposes a local MCP server on port 39101 when Developer Mode is enabled. This provides user-scoped access plus UI control, navigation, and screenshot capabilities.

#### Claude Code

```json
{
  "mcpServers": {
    "daccord": {
      "type": "streamable-http",
      "url": "http://localhost:39101/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_DACCORD_MCP_TOKEN"
      }
    }
  }
}
```

Or add it interactively:

```bash
claude mcp add daccord --transport http http://localhost:39101/mcp \
  -H "Authorization: Bearer YOUR_DACCORD_MCP_TOKEN"
```

#### Using Both Together

An AI agent can use both MCP servers simultaneously -- server MCP for admin tasks and data seeding, client MCP for navigating the UI and visually verifying results:

```json
{
  "mcpServers": {
    "accord": {
      "type": "streamable-http",
      "url": "http://localhost:39099/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    },
    "daccord": {
      "type": "streamable-http",
      "url": "http://localhost:39101/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_DACCORD_MCP_TOKEN"
      }
    }
  }
}
```

### Any MCP-compatible client

Both endpoints speak standard MCP over streamable HTTP:

- **Server**: `http://your-server:39099/mcp` + `Authorization: Bearer <MCP_API_KEY>`
- **Client**: `http://localhost:39101/mcp` + `Authorization: Bearer <DACCORD_TOKEN>`
- **Transport**: Streamable HTTP (POST)
- **Protocol version**: `2025-03-26`

## Standalone CLI Clients

### Server CLI (`accord-mcp`)

Interactive client for the accordserver MCP endpoint.

```bash
npm install && npm run build
export ACCORD_MCP_API_KEY="your-key"
npm start
```

| Variable | Description | Default |
|----------|-------------|---------|
| `ACCORD_MCP_URL` | Server MCP endpoint URL | `http://localhost:39099/mcp` |
| `ACCORD_MCP_API_KEY` | Server MCP API key (required) | -- |

### Client CLI (`daccord-mcp`)

Interactive client for the daccord desktop app's local MCP server.

```bash
npm install && npm run build
export DACCORD_MCP_TOKEN="your-token"
npm run start:client
```

| Variable | Description | Default |
|----------|-------------|---------|
| `DACCORD_MCP_URL` | Client MCP endpoint URL | `http://localhost:39101/mcp` |
| `DACCORD_MCP_TOKEN` | Client MCP bearer token (required) | -- |

Copy the token from daccord's App Settings > Developer > MCP Server section.

### Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/DaccordProject/accordserver-mcp/main/install.sh | bash
```

### Server CLI example session

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

### Client CLI example session

```
$ export DACCORD_MCP_TOKEN="dk_a1b2...c3d4"
$ npm run start:client

Connecting to daccord client at http://localhost:39101/mcp...
Connected. Type 'help' for commands.

daccord> state
daccord> spaces
daccord> select-space abc123
daccord> select-channel def456
daccord> screenshot /tmp/audit.png
daccord> viewport compact
daccord> screenshot /tmp/audit_compact.png
daccord> navigate 6.2 with_reply
daccord> screenshot
daccord> exit
```

## Server CLI Commands

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

## Client CLI Commands

| Command | Description |
|---------|-------------|
| **Read** | |
| `state` | Current app state (space, channel, layout) |
| `spaces` | List connected spaces |
| `space <id>` | Space details |
| `channels <space_id>` | List channels |
| `members <space_id> [limit]` | List members |
| `user <user_id>` | User info |
| `messages <channel_id> [limit]` | List messages |
| `search <space_id> <query>` | Search messages |
| **Navigate** | |
| `select-space <space_id>` | Switch to a space |
| `select-channel <channel_id>` | Switch to a channel |
| `open-dm <user_id>` | Open a DM |
| `open-settings [page]` | Open settings |
| `open-discovery` | Open server discovery |
| `open-thread <message_id>` | Open a thread |
| `open-voice` | Open voice view |
| `toggle-members` | Toggle member list |
| `toggle-search` | Toggle search panel |
| `navigate <surface_id> [state]` | Navigate to UI surface |
| `dialog <name>` | Open a named dialog |
| `viewport <preset\|WxH>` | Resize viewport |
| **Screenshot** | |
| `screenshot [save_path]` | Capture viewport |
| `surfaces [section]` | List UI surfaces |
| `surface-info <surface_id>` | Surface prerequisites |
| **Message** | |
| `send <channel_id> <message>` | Send a message |
| `edit <message_id> <content>` | Edit a message |
| `delete-message <message_id>` | Delete a message |
| `react <message_id> <emoji>` | Add a reaction |
| **Moderation** | |
| `kick <space_id> <user_id>` | Kick a member |
| `ban <space_id> <user_id> [reason]` | Ban a user |
| `unban <space_id> <user_id>` | Unban a user |
| `timeout <space_id> <user_id> <s>` | Timeout a member |
| **Voice** | |
| `join-voice <channel_id>` | Join voice channel |
| `leave-voice` | Leave voice |
| `mute` | Toggle mute |
| `deafen` | Toggle deafen |
| **Other** | |
| `tools` | List available MCP tools |
| `call <tool> [json_args]` | Call any tool directly |
| `help` | Show help |
| `exit` | Quit |

## Available Tools

### Server MCP Tools (15)

#### Read Operations

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

#### Write Operations

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `send_message` | Send a message to a channel | `channel_id`, `content`, optional `reply_to` |
| `create_channel` | Create a channel in a space | `space_id`, `name`, optional `channel_type`, `topic` |
| `delete_channel` | Delete a channel | `channel_id` |
| `delete_message` | Delete a message | `message_id` |

#### Moderation

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `kick_member` | Remove a member from a space | `space_id`, `user_id` |
| `ban_user` | Ban a user from a space | `space_id`, `user_id`, optional `reason` |
| `unban_user` | Remove a ban | `space_id`, `user_id` |

### Client MCP Tools (35)

Tools are organized into 6 groups. Only `read`, `navigate`, and `screenshot` are enabled by default; destructive groups (`message`, `moderate`, `voice`) require opt-in in daccord's Developer settings.

#### Read (8 tools)

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `get_current_state` | Current app state | _(none)_ |
| `list_spaces` | Connected spaces | _(none)_ |
| `get_space` | Space details | `space_id` |
| `list_channels` | Channels in a space | `space_id` |
| `list_members` | Space members | `space_id`, optional `limit` |
| `get_user` | User info | `user_id` |
| `list_messages` | Channel messages | `channel_id`, optional `limit`, `after` |
| `search_messages` | Search messages | `space_id`, optional `query`, `author_id`, `channel_id`, `limit` |

#### Navigate (12 tools)

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `select_space` | Switch active space | `space_id` |
| `select_channel` | Switch active channel | `channel_id` |
| `open_dm` | Open DM conversation | `user_id` |
| `open_settings` | Open settings | optional `page` |
| `open_discovery` | Open server discovery | _(none)_ |
| `open_thread` | Open thread panel | `message_id` |
| `open_voice_view` | Open voice view | _(none)_ |
| `toggle_member_list` | Toggle member list | _(none)_ |
| `toggle_search` | Toggle search | _(none)_ |
| `navigate_to_surface` | Navigate to UI surface | `surface_id`, optional `state` |
| `open_dialog` | Open named dialog | `dialog_name` |
| `set_viewport_size` | Resize viewport | optional `preset`, `width`, `height` |

#### Screenshot (3 tools)

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `take_screenshot` | Capture viewport PNG | optional `save_path` |
| `list_surfaces` | List auditable UI surfaces | optional `section` |
| `get_surface_info` | Surface prerequisites | `surface_id` |

#### Message (4 tools)

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `send_message` | Send message as user | `channel_id`, `content`, optional `reply_to` |
| `edit_message` | Edit own message | `message_id`, `content` |
| `delete_message` | Delete message | `message_id` |
| `add_reaction` | React to message | `message_id`, `emoji` |

#### Moderate (4 tools)

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `kick_member` | Kick member | `space_id`, `user_id` |
| `ban_user` | Ban user | `space_id`, `user_id`, optional `reason` |
| `unban_user` | Unban user | `space_id`, `user_id` |
| `timeout_member` | Timeout member | `space_id`, `user_id`, `duration_seconds` |

#### Voice (4 tools)

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `join_voice_channel` | Join voice channel | `channel_id` |
| `leave_voice` | Leave voice | _(none)_ |
| `toggle_mute` | Toggle mute | _(none)_ |
| `toggle_deafen` | Toggle deafen | _(none)_ |

## Protocol Details

Both clients use the same MCP protocol:

- **Transport**: Streamable HTTP (POST)
- **Auth**: `Authorization: Bearer <token>`
- **Protocol version**: `2025-03-26`
- **Format**: JSON-RPC 2.0

### Key Differences

| Aspect | Server MCP | Client MCP |
|--------|-----------|------------|
| Endpoint | `POST /mcp` on accordserver | `POST /mcp` on daccord client |
| Default port | 39099 | 39101 |
| Auth token | Server-wide `MCP_API_KEY` env var | Per-account token from Developer settings |
| Permissions | Full admin access | User's own permissions only |
| Message attribution | `"mcp"` author | Current logged-in user |
| UI control | N/A | Full navigation + screenshot |
| Network | Can be remote | Localhost only (`127.0.0.1`) |
| Tool count | 15 | 35 |

## Security Notes

### Server MCP
- The MCP API key grants full administrative access to the server
- Treat it like a root credential -- do not expose it in client-side code or logs
- The endpoint is disabled entirely unless `MCP_API_KEY` is set on the server
- Messages sent via MCP are attributed to author `"mcp"` for auditability

### Client MCP
- Requires two explicit opt-in steps: Developer Mode + MCP toggle
- Token is stored in encrypted per-profile config; displayed masked in the UI
- Listener is bound to `127.0.0.1` only -- never exposed to the network
- Destructive tool groups (message, moderate, voice) require explicit opt-in
- Moderation tools additionally check the user's server permissions before executing
- Rate limited to 60 requests/second with 5-second read timeout
- Token can be rotated at any time from Developer settings

## TypeScript Library Usage

Both clients can be imported as libraries:

```typescript
// Server MCP
import { AccordMCPClient } from "accordserver-mcp-client";

const server = new AccordMCPClient({
  url: "http://localhost:39099/mcp",
  apiKey: "your-api-key",
});
await server.connect();
const spaces = await server.listSpaces();

// Client MCP
import { DaccordClientMCPClient } from "accordserver-mcp-client/client-mcp";

const client = new DaccordClientMCPClient({
  url: "http://localhost:39101/mcp",
  token: "dk_a1b2...c3d4",
});
await client.connect();
const state = await client.getCurrentState();
await client.selectSpace("123");
const screenshot = await client.takeScreenshot("/tmp/audit.png");
```
