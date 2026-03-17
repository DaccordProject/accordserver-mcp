#!/usr/bin/env node

import * as readline from "node:readline";
import { DaccordClientMCPClient } from "./client-mcp.js";

const url = process.env.DACCORD_MCP_URL ?? "http://localhost:39101/mcp";
const token = process.env.DACCORD_MCP_TOKEN ?? "";

if (!token) {
  console.error("Error: DACCORD_MCP_TOKEN environment variable is required");
  console.error("Copy the token from daccord App Settings > Developer > MCP Server");
  process.exit(1);
}

const client = new DaccordClientMCPClient({ url, token });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt() {
  rl.question("daccord> ", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return prompt();

    if (trimmed === "exit" || trimmed === "quit") {
      await client.close();
      rl.close();
      return;
    }

    if (trimmed === "help") {
      printHelp();
      return prompt();
    }

    if (trimmed === "tools") {
      try {
        const tools = await client.listTools();
        for (const tool of tools) {
          console.log(`  ${tool.name} - ${tool.description}`);
        }
      } catch (err) {
        printError(err);
      }
      return prompt();
    }

    const parts = trimmed.split(/\s+/);
    const command = parts[0];

    try {
      switch (command) {
        // --- Read ---
        case "state":
          printResult(await client.getCurrentState());
          break;

        case "spaces":
          printResult(await client.listSpaces());
          break;

        case "space":
          requireArgs(parts, 1, "space <space_id>");
          printResult(await client.getSpace(parts[1]));
          break;

        case "channels":
          requireArgs(parts, 1, "channels <space_id>");
          printResult(await client.listChannels(parts[1]));
          break;

        case "members":
          requireArgs(parts, 1, "members <space_id> [limit]");
          printResult(await client.listMembers(parts[1], parts[2] ? parseInt(parts[2]) : undefined));
          break;

        case "user":
          requireArgs(parts, 1, "user <user_id>");
          printResult(await client.getUser(parts[1]));
          break;

        case "messages":
          requireArgs(parts, 1, "messages <channel_id> [limit] [after]");
          printResult(
            await client.listMessages(
              parts[1],
              parts[2] ? parseInt(parts[2]) : undefined,
              parts[3]
            )
          );
          break;

        case "search":
          requireArgs(parts, 2, "search <space_id> <query> [limit]");
          printResult(
            await client.searchMessages(parts[1], {
              query: parts.slice(2, parts[3] ? -1 : undefined).join(" "),
              limit: parts.length > 3 ? parseInt(parts[parts.length - 1]) : undefined,
            })
          );
          break;

        // --- Navigate ---
        case "select-space":
          requireArgs(parts, 1, "select-space <space_id>");
          printResult(await client.selectSpace(parts[1]));
          break;

        case "select-channel":
          requireArgs(parts, 1, "select-channel <channel_id>");
          printResult(await client.selectChannel(parts[1]));
          break;

        case "open-dm":
          requireArgs(parts, 1, "open-dm <user_id>");
          printResult(await client.openDm(parts[1]));
          break;

        case "open-settings":
          printResult(await client.openSettings(parts[1]));
          break;

        case "open-discovery":
          printResult(await client.openDiscovery());
          break;

        case "open-thread":
          requireArgs(parts, 1, "open-thread <message_id>");
          printResult(await client.openThread(parts[1]));
          break;

        case "open-voice":
          printResult(await client.openVoiceView());
          break;

        case "toggle-members":
          printResult(await client.toggleMemberList());
          break;

        case "toggle-search":
          printResult(await client.toggleSearch());
          break;

        case "navigate":
          requireArgs(parts, 1, "navigate <surface_id> [state]");
          printResult(await client.navigateToSurface(parts[1], parts[2]));
          break;

        case "dialog":
          requireArgs(parts, 1, "dialog <dialog_name>");
          printResult(await client.openDialog(parts[1]));
          break;

        case "viewport":
          requireArgs(parts, 1, "viewport <preset|WxH>");
          {
            const val = parts[1];
            if (val.includes("x")) {
              const [w, h] = val.split("x").map(Number);
              printResult(await client.setViewportSize({ width: w, height: h }));
            } else {
              printResult(await client.setViewportSize({ preset: val }));
            }
          }
          break;

        // --- Screenshot ---
        case "screenshot":
          printResult(await client.takeScreenshot(parts[1]));
          break;

        case "surfaces":
          printResult(await client.listSurfaces(parts.slice(1).join(" ") || undefined));
          break;

        case "surface-info":
          requireArgs(parts, 1, "surface-info <surface_id>");
          printResult(await client.getSurfaceInfo(parts[1]));
          break;

        // --- Message ---
        case "send":
          requireArgs(parts, 2, "send <channel_id> <message...>");
          printResult(await client.sendMessage(parts[1], parts.slice(2).join(" ")));
          break;

        case "edit":
          requireArgs(parts, 2, "edit <message_id> <new_content...>");
          printResult(await client.editMessage(parts[1], parts.slice(2).join(" ")));
          break;

        case "delete-message":
          requireArgs(parts, 1, "delete-message <message_id>");
          printResult(await client.deleteMessage(parts[1]));
          break;

        case "react":
          requireArgs(parts, 2, "react <message_id> <emoji>");
          printResult(await client.addReaction(parts[1], parts[2]));
          break;

        // --- Moderation ---
        case "kick":
          requireArgs(parts, 2, "kick <space_id> <user_id>");
          printResult(await client.kickMember(parts[1], parts[2]));
          break;

        case "ban":
          requireArgs(parts, 2, "ban <space_id> <user_id> [reason...]");
          printResult(
            await client.banUser(
              parts[1],
              parts[2],
              parts.length > 3 ? parts.slice(3).join(" ") : undefined
            )
          );
          break;

        case "unban":
          requireArgs(parts, 2, "unban <space_id> <user_id>");
          printResult(await client.unbanUser(parts[1], parts[2]));
          break;

        case "timeout":
          requireArgs(parts, 3, "timeout <space_id> <user_id> <seconds>");
          printResult(await client.timeoutMember(parts[1], parts[2], parseInt(parts[3])));
          break;

        // --- Voice ---
        case "join-voice":
          requireArgs(parts, 1, "join-voice <channel_id>");
          printResult(await client.joinVoiceChannel(parts[1]));
          break;

        case "leave-voice":
          printResult(await client.leaveVoice());
          break;

        case "mute":
          printResult(await client.toggleMute());
          break;

        case "deafen":
          printResult(await client.toggleDeafen());
          break;

        // --- Generic ---
        case "call":
          requireArgs(parts, 1, "call <tool_name> [json_args]");
          {
            const args = parts.length > 2 ? JSON.parse(parts.slice(2).join(" ")) : {};
            printResult(await client.callTool(parts[1], args));
          }
          break;

        default:
          console.log(`Unknown command: ${command}. Type "help" for available commands.`);
      }
    } catch (err) {
      printError(err);
    }

    prompt();
  });
}

function requireArgs(parts: string[], count: number, usage: string) {
  if (parts.length < count + 1) {
    throw new Error(`Usage: ${usage}`);
  }
}

function printResult(result: unknown) {
  const r = result as { content?: Array<{ type?: string; text?: string; data?: string }>; isError?: boolean };
  if (r.content) {
    for (const item of r.content) {
      if (item.type === "image") {
        console.log(`[image: ${item.data ? `${item.data.length} bytes base64` : "empty"}]`);
      } else if (item.text) {
        try {
          console.log(JSON.stringify(JSON.parse(item.text), null, 2));
        } catch {
          console.log(item.text);
        }
      }
    }
  }
  if (r.isError) {
    console.error("(tool returned an error)");
  }
}

function printError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
}

function printHelp() {
  console.log(`
Daccord Client MCP CLI — Controls the daccord desktop app via its local MCP server

Read:
  state                             Current app state (space, channel, layout)
  spaces                            List connected spaces
  space <id>                        Space details
  channels <space_id>               List channels
  members <space_id> [limit]        List members
  user <user_id>                    User info
  messages <channel_id> [limit]     List messages
  search <space_id> <query>         Search messages

Navigate:
  select-space <space_id>           Switch to a space
  select-channel <channel_id>       Switch to a channel
  open-dm <user_id>                 Open a DM
  open-settings [page]              Open app/user settings
  open-discovery                    Open server discovery
  open-thread <message_id>          Open a thread
  open-voice                        Open voice view
  toggle-members                    Toggle member list
  toggle-search                     Toggle search panel
  navigate <surface_id> [state]     Navigate to UI surface (for auditing)
  dialog <name>                     Open a named dialog
  viewport <preset|WxH>             Resize viewport (compact/medium/full or 1280x720)

Screenshot:
  screenshot [save_path]            Capture viewport screenshot
  surfaces [section]                List UI surfaces
  surface-info <surface_id>         Get surface prerequisites

Message:
  send <channel_id> <message...>    Send a message
  edit <message_id> <content...>    Edit a message
  delete-message <message_id>       Delete a message
  react <message_id> <emoji>        Add a reaction

Moderation:
  kick <space_id> <user_id>         Kick a member
  ban <space_id> <user_id> [reason] Ban a user
  unban <space_id> <user_id>        Unban a user
  timeout <space_id> <user_id> <s>  Timeout a member

Voice:
  join-voice <channel_id>           Join a voice channel
  leave-voice                       Leave voice
  mute                              Toggle mute
  deafen                            Toggle deafen

Other:
  tools                             List available MCP tools
  call <tool> [json_args]           Call any tool directly
  help                              Show this help
  exit                              Quit
`);
}

async function main() {
  console.log(`Connecting to daccord client at ${url}...`);
  try {
    await client.connect();
    console.log("Connected. Type 'help' for commands.\n");
    prompt();
  } catch (err) {
    console.error("Failed to connect. Is daccord running with Developer Mode + MCP enabled?");
    printError(err);
    process.exit(1);
  }
}

main();
