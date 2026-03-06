import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface AccordClientOptions {
  url: string;
  apiKey: string;
  clientName?: string;
  clientVersion?: string;
}

export class AccordMCPClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport;

  constructor(options: AccordClientOptions) {
    this.client = new Client({
      name: options.clientName ?? "accord-mcp-client",
      version: options.clientVersion ?? "0.1.0",
    });

    this.transport = new StreamableHTTPClientTransport(
      new URL(options.url),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
          },
        },
      }
    );
  }

  async connect(): Promise<void> {
    await this.client.connect(this.transport);
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  async listTools() {
    const result = await this.client.listTools();
    return result.tools;
  }

  async callTool(name: string, args: Record<string, unknown> = {}) {
    const result = await this.client.callTool({ name, arguments: args });
    return result;
  }

  // --- Read Operations ---

  async serverInfo() {
    return this.callTool("server_info");
  }

  async listSpaces() {
    return this.callTool("list_spaces");
  }

  async getSpace(spaceId: string) {
    return this.callTool("get_space", { space_id: spaceId });
  }

  async listChannels(spaceId: string) {
    return this.callTool("list_channels", { space_id: spaceId });
  }

  async listMembers(spaceId: string, limit?: number) {
    const args: Record<string, unknown> = { space_id: spaceId };
    if (limit !== undefined) args.limit = limit;
    return this.callTool("list_members", args);
  }

  async getUser(userId: string) {
    return this.callTool("get_user", { user_id: userId });
  }

  async listMessages(channelId: string, limit?: number, after?: string) {
    const args: Record<string, unknown> = { channel_id: channelId };
    if (limit !== undefined) args.limit = limit;
    if (after !== undefined) args.after = after;
    return this.callTool("list_messages", args);
  }

  async searchMessages(
    spaceId: string,
    options?: { query?: string; authorId?: string; channelId?: string; limit?: number }
  ) {
    const args: Record<string, unknown> = { space_id: spaceId };
    if (options?.query) args.query = options.query;
    if (options?.authorId) args.author_id = options.authorId;
    if (options?.channelId) args.channel_id = options.channelId;
    if (options?.limit !== undefined) args.limit = options.limit;
    return this.callTool("search_messages", args);
  }

  // --- Write Operations ---

  async sendMessage(channelId: string, content: string, replyTo?: string) {
    const args: Record<string, unknown> = { channel_id: channelId, content };
    if (replyTo) args.reply_to = replyTo;
    return this.callTool("send_message", args);
  }

  async createChannel(
    spaceId: string,
    name: string,
    options?: { channelType?: string; topic?: string }
  ) {
    const args: Record<string, unknown> = { space_id: spaceId, name };
    if (options?.channelType) args.channel_type = options.channelType;
    if (options?.topic) args.topic = options.topic;
    return this.callTool("create_channel", args);
  }

  async deleteChannel(channelId: string) {
    return this.callTool("delete_channel", { channel_id: channelId });
  }

  async deleteMessage(messageId: string) {
    return this.callTool("delete_message", { message_id: messageId });
  }

  // --- Moderation ---

  async kickMember(spaceId: string, userId: string) {
    return this.callTool("kick_member", { space_id: spaceId, user_id: userId });
  }

  async banUser(spaceId: string, userId: string, reason?: string) {
    const args: Record<string, unknown> = { space_id: spaceId, user_id: userId };
    if (reason) args.reason = reason;
    return this.callTool("ban_user", args);
  }

  async unbanUser(spaceId: string, userId: string) {
    return this.callTool("unban_user", { space_id: spaceId, user_id: userId });
  }
}
