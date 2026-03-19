#!/usr/bin/env node

/**
 * Automated UI audit script for daccord.
 *
 * Drives the running daccord desktop app via its local MCP server to capture
 * screenshots of all UI surfaces at multiple breakpoints and theme presets.
 *
 * Prerequisites:
 *   1. Launch daccord with Developer Mode + MCP Server enabled (port 39101)
 *   2. Set DACCORD_MCP_TOKEN to the token shown in App Settings → Developer
 *
 * Usage:
 *   DACCORD_MCP_TOKEN=<token> tsx src/ui-audit.ts [options]
 *   DACCORD_MCP_TOKEN=<token> node dist/ui-audit.js [options]
 *
 * Options:
 *   --output <dir>        Output directory for screenshots (default: ./audit-output)
 *   --themes <...>        Themes to capture, space-separated (default: dark light)
 *   --breakpoints <...>   Breakpoints to capture: compact medium full (default: all three)
 *   --sections <...>      Section IDs to audit e.g. "1 2 3" (default: all 1-22)
 *   --no-dialogs          Skip dialog captures
 *   --dry-run             Print the capture plan without actually running
 *   --delay <ms>          Milliseconds to wait after navigation before screenshot (default: 300)
 *   --url <url>           MCP server URL (default: http://localhost:39101/mcp)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { DaccordClientMCPClient } from "./client-mcp.js";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface AuditOptions {
  outputDir: string;
  themes: string[];
  breakpoints: string[];
  sections: number[] | "all";
  includeDialogs: boolean;
  dryRun: boolean;
  delayMs: number;
  url: string;
  token: string;
}

function parseArgs(): AuditOptions {
  const args = process.argv.slice(2);
  const opts: AuditOptions = {
    outputDir: "./audit-output",
    themes: ["dark", "light"],
    breakpoints: ["compact", "medium", "full"],
    sections: "all",
    includeDialogs: true,
    dryRun: false,
    delayMs: 300,
    url: process.env.DACCORD_MCP_URL ?? "http://localhost:39101/mcp",
    token: process.env.DACCORD_MCP_TOKEN ?? "",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--output":
        opts.outputDir = args[++i];
        break;
      case "--themes":
        opts.themes = collectList(args, i + 1);
        i += opts.themes.length;
        break;
      case "--breakpoints":
        opts.breakpoints = collectList(args, i + 1);
        i += opts.breakpoints.length;
        break;
      case "--sections":
        opts.sections = collectList(args, i + 1).map(Number);
        i += (opts.sections as number[]).length;
        break;
      case "--no-dialogs":
        opts.includeDialogs = false;
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--delay":
        opts.delayMs = parseInt(args[++i], 10);
        break;
      case "--url":
        opts.url = args[++i];
        break;
    }
  }

  if (!opts.token) {
    console.error(
      "Error: DACCORD_MCP_TOKEN environment variable is required.\n" +
        "Copy the token from daccord App Settings → Developer → MCP Server."
    );
    process.exit(1);
  }

  return opts;
}

/** Collect non-flag tokens starting at index until next flag or end of args. */
function collectList(args: string[], startIdx: number): string[] {
  const result: string[] = [];
  for (let j = startIdx; j < args.length && !args[j].startsWith("--"); j++) {
    result.push(args[j]);
  }
  return result.length ? result : [];
}

// ---------------------------------------------------------------------------
// Surface catalog (mirrors client_test_api_navigate.gd SURFACE_CATALOG)
// ---------------------------------------------------------------------------

interface Surface {
  id: string;
  section: number;
  name: string;
  slug: string;
}

/** Dialogs exposed via open_dialog in ClientTestApiNavigate.DIALOG_MAP */
const DIALOG_NAMES = [
  "add_server",
  "create_channel",
  "edit_channel",
  "create_invite",
  "create_role",
  "edit_role",
  "space_settings",
  "profile_card",
  "app_settings",
  "user_settings",
  "update_download",
  "image_lightbox",
  "emoji_picker",
  "channel_permissions",
  "ban_list",
  "server_management",
  "screen_picker",
  "confirm",
  "create_space",
  "edit_category",
  "delete_category",
  "report_user",
  "audit_log",
  "change_password",
  "delete_account",
  "two_factor",
  "profile_export",
  "profile_import",
  "folder_color",
] as const;

// ---------------------------------------------------------------------------
// MCP result helpers
// ---------------------------------------------------------------------------

type McpResult = {
  content?: Array<{ type?: string; text?: string; data?: string }>;
  isError?: boolean;
};

function extractText(result: unknown): unknown {
  const r = result as McpResult;
  if (r.content) {
    for (const item of r.content) {
      if (item.type === "text" && item.text) {
        try {
          return JSON.parse(item.text);
        } catch {
          return item.text;
        }
      }
    }
  }
  return result;
}

function isOk(result: unknown): boolean {
  const data = extractText(result) as Record<string, unknown>;
  return !!(data?.ok);
}

// ---------------------------------------------------------------------------
// Audit runner
// ---------------------------------------------------------------------------

async function runAudit(opts: AuditOptions): Promise<void> {
  console.log("Daccord UI Audit");
  console.log("=================");
  console.log(`Output:      ${opts.outputDir}`);
  console.log(`Themes:      ${opts.themes.join(", ")}`);
  console.log(`Breakpoints: ${opts.breakpoints.join(", ")}`);
  console.log(`Sections:    ${opts.sections === "all" ? "all" : (opts.sections as number[]).join(", ")}`);
  console.log(`Dialogs:     ${opts.includeDialogs}`);
  console.log(`Dry run:     ${opts.dryRun}`);
  console.log();

  if (!opts.dryRun) {
    fs.mkdirSync(opts.outputDir, { recursive: true });
  }

  const client = new DaccordClientMCPClient({ url: opts.url, token: opts.token });

  if (!opts.dryRun) {
    console.log(`Connecting to ${opts.url} ...`);
    await client.connect();
    console.log("Connected.\n");
  }

  // Fetch surface catalog from the app
  let surfaces: Surface[] = [];
  if (!opts.dryRun) {
    const raw = await client.listSurfaces();
    const data = extractText(raw) as Record<string, unknown>;
    if (data?.surfaces && Array.isArray(data.surfaces)) {
      surfaces = (data.surfaces as Array<Record<string, unknown>>).map((s) => ({
        id: s.id as string,
        section: parseInt((s.id as string).split(".")[0], 10),
        name: s.name as string,
        slug: slugify(s.name as string),
      }));
    }
    if (!surfaces.length) {
      // Fall back: generate IDs 1.1-22.x from the known section sizes
      console.warn("Could not fetch surface catalog from app — using generated IDs 1.1-22.1");
      surfaces = generateFallbackSurfaces();
    }
  } else {
    surfaces = generateFallbackSurfaces();
  }

  // Filter by requested sections
  const filteredSurfaces =
    opts.sections === "all"
      ? surfaces
      : surfaces.filter((s) => (opts.sections as number[]).includes(s.section));

  const stats = { total: 0, ok: 0, skipped: 0, errors: 0 };

  // Capture surfaces
  for (const theme of opts.themes) {
    for (const breakpoint of opts.breakpoints) {
      const prefix = `${theme}_${breakpoint}`;
      console.log(`\n--- ${theme} / ${breakpoint} (${filteredSurfaces.length} surfaces) ---`);

      if (!opts.dryRun) {
        await client.setTheme(theme);
        await client.setViewportSize({ preset: breakpoint });
        await sleep(200);
      }

      for (const surface of filteredSurfaces) {
        const filename = `${surface.id}_${surface.slug}_${prefix}.png`;
        const savePath = path.join(opts.outputDir, filename);

        if (opts.dryRun) {
          console.log(`  [dry-run] ${filename}`);
          stats.total++;
          continue;
        }

        process.stdout.write(`  ${surface.id} ${surface.name} ... `);
        try {
          const navResult = await client.navigateToSurface(surface.id);
          if (!isOk(navResult)) {
            console.log("SKIP (navigation failed)");
            stats.skipped++;
            stats.total++;
            continue;
          }
          await sleep(opts.delayMs);
          await client.takeScreenshot(savePath);
          console.log("OK");
          stats.ok++;
        } catch (err) {
          console.log(`ERROR: ${(err as Error).message}`);
          stats.errors++;
        }
        stats.total++;
      }

      // Capture dialogs for this theme + breakpoint
      if (opts.includeDialogs) {
        console.log(`\n  Dialogs (${theme}/${breakpoint}):`);
        for (const dialogName of DIALOG_NAMES) {
          const filename = `dialog_${dialogName}_${prefix}.png`;
          const savePath = path.join(opts.outputDir, filename);

          if (opts.dryRun) {
            console.log(`  [dry-run] ${filename}`);
            stats.total++;
            continue;
          }

          process.stdout.write(`  dialog:${dialogName} ... `);
          try {
            const openResult = await client.openDialog(dialogName);
            if (!isOk(openResult)) {
              console.log("SKIP (open failed)");
              stats.skipped++;
              stats.total++;
              continue;
            }
            await sleep(opts.delayMs);
            await client.takeScreenshot(savePath);
            console.log("OK");
            stats.ok++;
          } catch (err) {
            console.log(`ERROR: ${(err as Error).message}`);
            stats.errors++;
          }
          stats.total++;
        }
      }
    }
  }

  // Write manifest
  if (!opts.dryRun) {
    const manifest = {
      generated_at: new Date().toISOString(),
      themes: opts.themes,
      breakpoints: opts.breakpoints,
      surface_count: filteredSurfaces.length,
      dialog_count: opts.includeDialogs ? DIALOG_NAMES.length : 0,
      stats,
      surfaces: filteredSurfaces.map((s) => s.id),
      dialogs: opts.includeDialogs ? [...DIALOG_NAMES] : [],
    };
    fs.writeFileSync(
      path.join(opts.outputDir, "manifest.json"),
      JSON.stringify(manifest, null, 2)
    );
  }

  console.log("\n=== Audit complete ===");
  console.log(`Total: ${stats.total}  OK: ${stats.ok}  Skipped: ${stats.skipped}  Errors: ${stats.errors}`);
  if (!opts.dryRun) {
    console.log(`Screenshots saved to: ${path.resolve(opts.outputDir)}`);
  }

  if (!opts.dryRun) {
    await client.close();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Fallback surface list when the app is unavailable (dry-run) or list_surfaces
 * returns empty. Generates IDs for all 121 surfaces across the 22 sections
 * documented in ui_audit.md.
 */
function generateFallbackSurfaces(): Surface[] {
  const SECTION_COUNTS: Record<number, [string, string[]]> = {
    1: ["Main Window & Navigation", ["main_window", "welcome_screen", "toast", "mobile_drawer", "panel_resize"]],
    2: ["Guild Bar", ["guild_bar", "guild_icon", "guild_folder", "mention_badge", "selection_pill", "dm_button", "discover_button", "add_server_button", "add_server_dialog", "auth_dialog", "change_password_dialog"]],
    3: ["Channel List", ["channel_list", "channel_banner", "category_item", "text_channel_item", "voice_channel_item", "channel_skeleton", "uncategorized_drop_target"]],
    4: ["DMs & Friends", ["dm_list", "friends_list", "friend_item", "dm_channel_item", "add_friend_dialog", "add_member_dialog", "create_group_dm_dialog"]],
    5: ["User Bar & Voice Bar", ["user_bar", "voice_bar", "screen_picker_dialog"]],
    6: ["Message View", ["message_view", "cozy_message", "collapsed_message", "message_content", "message_action_bar", "reaction_bar", "reaction_pill", "reaction_picker", "embed", "image_lightbox", "loading_skeleton", "typing_indicator", "update_banner", "update_download_dialog"]],
    7: ["Composer", ["composer", "message_input", "emoji_picker", "emoji_button_cell"]],
    8: ["Threads & Forums", ["thread_panel", "active_threads_dialog", "forum_view", "forum_post_row", "voice_text_panel"]],
    9: ["Members", ["member_list", "member_item", "member_header", "anonymous_entry_item"]],
    10: ["User Profile & Settings", ["profile_card", "app_settings", "profiles_page", "user_settings_profile", "user_settings_danger", "user_settings_twofa", "updates_settings", "about_page", "create_profile_dialog", "server_settings", "change_password_dialog", "set_password_dialog", "password_field", "settings_base"]],
    11: ["Admin Server & Space", ["server_management_panel", "space_settings_dialog", "create_space_dialog", "transfer_ownership_dialog"]],
    12: ["Admin Channels", ["channel_management_dialog", "create_channel_dialog", "channel_edit_dialog", "category_edit_dialog", "channel_row", "channel_permissions_dialog", "perm_overwrite_row"]],
    13: ["Admin Roles", ["role_management_dialog", "role_row"]],
    14: ["Admin Moderation", ["moderate_member_dialog", "ban_dialog", "ban_list_dialog", "ban_row", "nickname_dialog", "imposter_picker_dialog", "imposter_banner", "reset_password_dialog", "confirm_dialog"]],
    15: ["Admin Invites & Reports", ["invite_management_dialog", "invite_row", "report_dialog", "report_list_dialog", "report_row", "audit_log_dialog", "audit_log_row"]],
    16: ["Admin Content & Customization", ["emoji_management_dialog", "emoji_cell", "soundboard_management_dialog", "sound_row", "nsfw_gate_dialog", "rules_interstitial_dialog", "plugin_management_dialog"]],
    17: ["Discovery", ["discovery_panel", "discovery_card", "discovery_detail"]],
    18: ["Search", ["search_panel", "search_result_item"]],
    19: ["Video & Voice", ["video_grid", "video_tile", "video_pip", "vertical_resize_handle"]],
    20: ["Soundboard", ["soundboard_panel"]],
    21: ["Plugins", ["activity_modal", "activity_lobby", "plugin_trust_dialog", "plugin_canvas"]],
    22: ["Common / Reusable", ["modal_base", "avatar", "group_avatar"]],
  };

  const surfaces: Surface[] = [];
  for (const [sectionNum, [, names]] of Object.entries(SECTION_COUNTS)) {
    const sec = parseInt(sectionNum, 10);
    names.forEach((name, idx) => {
      surfaces.push({
        id: `${sec}.${idx + 1}`,
        section: sec,
        name,
        slug: name,
      });
    });
  }
  return surfaces;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

runAudit(parseArgs()).catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
