import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface DaccordClientOptions {
  url: string;
  token: string;
  clientName?: string;
  clientVersion?: string;
}

/**
 * MCP client for the daccord desktop client's local MCP server.
 *
 * Connects to the daccord app's MCP endpoint (default port 39101) which
 * provides UI control, navigation, screenshots, and user-scoped data access.
 * This is distinct from the server MCP (AccordMCPClient) which connects to
 * accordserver for admin-level operations.
 *
 * Requires Developer Mode enabled in daccord's App Settings.
 */
export class DaccordClientMCPClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport;

  constructor(options: DaccordClientOptions) {
    this.client = new Client({
      name: options.clientName ?? "daccord-client-mcp",
      version: options.clientVersion ?? "0.1.0",
    });

    this.transport = new StreamableHTTPClientTransport(
      new URL(options.url),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${options.token}`,
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

  // --- Read Operations (group: read) ---

  async getCurrentState() {
    return this.callTool("get_current_state");
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

  // --- Navigation Operations (group: navigate) ---

  async selectSpace(spaceId: string) {
    return this.callTool("select_space", { space_id: spaceId });
  }

  async selectChannel(channelId: string) {
    return this.callTool("select_channel", { channel_id: channelId });
  }

  async openDm(userId: string) {
    return this.callTool("open_dm", { user_id: userId });
  }

  async openSettings(page?: string) {
    const args: Record<string, unknown> = {};
    if (page) args.page = page;
    return this.callTool("open_settings", args);
  }

  async openDiscovery() {
    return this.callTool("open_discovery");
  }

  async openThread(messageId: string) {
    return this.callTool("open_thread", { message_id: messageId });
  }

  async openVoiceView() {
    return this.callTool("open_voice_view");
  }

  async toggleMemberList() {
    return this.callTool("toggle_member_list");
  }

  async toggleSearch() {
    return this.callTool("toggle_search");
  }

  async navigateToSurface(surfaceId: string, state?: string) {
    const args: Record<string, unknown> = { surface_id: surfaceId };
    if (state) args.state = state;
    return this.callTool("navigate_to_surface", args);
  }

  async openDialog(dialogName: string) {
    return this.callTool("open_dialog", { dialog_name: dialogName });
  }

  async setViewportSize(options: { preset?: string; width?: number; height?: number }) {
    return this.callTool("set_viewport_size", options as Record<string, unknown>);
  }

  async setTheme(preset: string): Promise<unknown>;
  async setTheme(options: { preset?: string; themeString?: string }): Promise<unknown>;
  async setTheme(arg: string | { preset?: string; themeString?: string }) {
    if (typeof arg === "string") return this.callTool("set_theme", { preset: arg });
    const args: Record<string, unknown> = {};
    if (arg.preset) args.preset = arg.preset;
    if (arg.themeString) args.theme_string = arg.themeString;
    return this.callTool("set_theme", args);
  }

  // --- Screenshot Operations (group: screenshot) ---

  async takeScreenshot(savePath?: string) {
    const args: Record<string, unknown> = {};
    if (savePath) args.save_path = savePath;
    return this.callTool("take_screenshot", args);
  }

  async listSurfaces(section?: string) {
    const args: Record<string, unknown> = {};
    if (section) args.section = section;
    return this.callTool("list_surfaces", args);
  }

  async getSurfaceInfo(surfaceId: string) {
    return this.callTool("get_surface_info", { surface_id: surfaceId });
  }

  async getDesignTokens() {
    return this.callTool("get_design_tokens");
  }

  // --- Message Operations (group: message) ---

  async sendMessage(channelId: string, content: string, replyTo?: string) {
    const args: Record<string, unknown> = { channel_id: channelId, content };
    if (replyTo) args.reply_to = replyTo;
    return this.callTool("send_message", args);
  }

  async editMessage(messageId: string, content: string) {
    return this.callTool("edit_message", { message_id: messageId, content });
  }

  async deleteMessage(messageId: string) {
    return this.callTool("delete_message", { message_id: messageId });
  }

  async addReaction(messageId: string, emoji: string) {
    return this.callTool("add_reaction", { message_id: messageId, emoji });
  }

  // --- Moderation Operations (group: moderate) ---

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

  async timeoutMember(spaceId: string, userId: string, durationSeconds: number) {
    return this.callTool("timeout_member", {
      space_id: spaceId,
      user_id: userId,
      duration_seconds: durationSeconds,
    });
  }

  // --- Voice Operations (group: voice) ---

  async joinVoiceChannel(channelId: string) {
    return this.callTool("join_voice_channel", { channel_id: channelId });
  }

  async leaveVoice() {
    return this.callTool("leave_voice");
  }

  async toggleMute() {
    return this.callTool("toggle_mute");
  }

  async toggleDeafen() {
    return this.callTool("toggle_deafen");
  }
}
