#!/usr/bin/env node

import * as readline from "node:readline";
import { AccordMCPClient } from "./client.js";

const url = process.env.ACCORD_MCP_URL ?? "http://localhost:39099/mcp";
const apiKey = process.env.ACCORD_MCP_API_KEY ?? "";

if (!apiKey) {
  console.error("Error: ACCORD_MCP_API_KEY environment variable is required");
  process.exit(1);
}

const client = new AccordMCPClient({ url, apiKey });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt() {
  rl.question("accord> ", async (line) => {
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

    // Parse: command [args...]
    const parts = trimmed.split(/\s+/);
    const command = parts[0];

    try {
      switch (command) {
        case "info":
          printResult(await client.serverInfo());
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

        case "send":
          requireArgs(parts, 2, "send <channel_id> <message...>");
          printResult(await client.sendMessage(parts[1], parts.slice(2).join(" ")));
          break;

        case "create-channel":
          requireArgs(parts, 2, "create-channel <space_id> <name> [--parent <parent_id>] [topic...]");
          {
            let parentId: string | undefined;
            let topicParts = parts.slice(3);
            const parentIdx = topicParts.indexOf("--parent");
            if (parentIdx !== -1) {
              parentId = topicParts[parentIdx + 1];
              topicParts = [...topicParts.slice(0, parentIdx), ...topicParts.slice(parentIdx + 2)];
            }
            printResult(
              await client.createChannel(parts[1], parts[2], {
                topic: topicParts.length > 0 ? topicParts.join(" ") : undefined,
                parentId,
              })
            );
          }
          break;

        case "delete-channel":
          requireArgs(parts, 1, "delete-channel <channel_id>");
          printResult(await client.deleteChannel(parts[1]));
          break;

        case "delete-message":
          requireArgs(parts, 1, "delete-message <message_id>");
          printResult(await client.deleteMessage(parts[1]));
          break;

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
  const r = result as { content?: Array<{ text?: string }>; isError?: boolean };
  if (r.content) {
    for (const item of r.content) {
      if (item.text) {
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
Accord MCP Client

Read:
  info                              Server info
  spaces                            List all spaces
  space <id>                        Space details
  channels <space_id>               List channels
  members <space_id> [limit]        List members
  user <user_id>                    User info
  messages <channel_id> [limit]     List messages
  search <space_id> <query>         Search messages

Write:
  send <channel_id> <message...>    Send a message
  create-channel <space_id> <name> [--parent <id>] [topic...]
  delete-channel <channel_id>
  delete-message <message_id>

Moderation:
  kick <space_id> <user_id>
  ban <space_id> <user_id> [reason...]
  unban <space_id> <user_id>

Other:
  tools                             List available MCP tools
  call <tool> [json_args]           Call any tool directly
  help                              Show this help
  exit                              Quit
`);
}

async function main() {
  console.log(`Connecting to ${url}...`);
  try {
    await client.connect();
    console.log("Connected. Type 'help' for commands.\n");
    prompt();
  } catch (err) {
    printError(err);
    process.exit(1);
  }
}

main();
