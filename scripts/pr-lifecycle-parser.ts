/**
 * Pure parsing and notification helper module for the Growing Worlds PR lifecycle.
 * Provides deterministic extraction of Discord username from PR body,
 * validation of merge event status, formatting of Discord notification messages,
 * and idempotency marker generation.
 */

export interface MergedPRNotificationParams {
  githubUsername: string;
  discordUsername?: string | null;
  prNumber: number;
  issueNumber?: number;
  prUrl?: string;
  prTitle?: string;
}

export interface ContributionIssueLike {
  number?: number;
  title?: string;
  body?: string;
  labels?: Array<{ name?: string } | string>;
}

export interface MergedPRDecisionParams {
  isMerged: boolean;
  hasIdempotencyMarker: boolean;
  discordUsername?: string | null;
}

export interface MergedPRDecisionResult {
  shouldSend: boolean;
  reason: string;
}

const INVALID_PLACEHOLDERS = new Set([
  "your-discord-username",
  "@your-discord-username",
  "<your-discord-username>",
  "_no response_",
  "no response",
  "none",
  "n/a",
  "na",
  "null",
  "undefined",
]);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extracts and cleans a Discord username from the PR markdown body.
 *
 * Tolerates:
 * - `**Discord Username:** username`
 * - `**Discord Username**: username`
 * - `- **Discord Username:** \`username\``
 * - `* **Discord Username**: username`
 * - `### Discord Username\n\nusername`
 * - Leading/trailing markdown formatting like backticks (` `), asterisks, quotes
 * - Optional `@` prefix (normalized off for clean username display or preserved if standard, but normalized to clean string)
 * - Trailing punctuation or commentary
 * - Returns `null` if empty or matching default placeholder (e.g. `your-discord-username`).
 */
export function extractDiscordUsername(body?: string | null): string | null {
  if (!body || typeof body !== "string") {
    return null;
  }

  const keywords = [
    "Discord Username",
    "Discord Handle",
    "Discord Tag",
    "Discord",
  ];

  let rawValue: string | null = null;

  // 1. Table style markdown: | **Discord Username** | `ShenSandaru` |
  for (const keyword of keywords) {
    const tableRegex = new RegExp(
      "(?:^|\\n)\\|\\s*\\*\\*[^\\r\\n]*?" +
        escapeRegex(keyword) +
        "[^\\r\\n]*?\\*\\*\\s*\\|\\s*(?:`?)([^`\\r\\n|]+?)(?:`?)\\s*\\|",
      "i"
    );
    const match = body.match(tableRegex);
    if (match && match[1]) {
      rawValue = match[1].trim();
      break;
    }
  }

  // 2. List or key-value style:
  // e.g. - **Discord Username:** `ShenSandaru`
  // e.g. **Discord Username**: ShenSandaru
  // e.g. Discord Username: ShenSandaru
  if (!rawValue) {
    for (const keyword of keywords) {
      const listRegex = new RegExp(
        `(?:^|\\n)[-*]?\\s*\\*{0,2}${escapeRegex(keyword)}\\*{0,2}\\s*:\\s*(?:` +
          `\\[e\\.g\\.,?\\s*)?([^\\]\\r\\n]+?)(?:\\])?(?=[\\r\\n]|$)`,
        "i"
      );
      const match = body.match(listRegex);
      if (match && match[1]) {
        rawValue = match[1].trim();
        break;
      }
    }
  }

  // 3. Heading style:
  // ### Discord Username
  // ShenSandaru
  if (!rawValue) {
    for (const keyword of keywords) {
      const headingRegex = new RegExp(
        `(?:^|\\n)#{1,4}\\s*(?:[^\\r\\n]*?\\s)?${escapeRegex(keyword)}(?:\\s[^\\r\\n]*?)?[\\r\\n]+([\\s\\S]*?)(?=(?:\\n#{1,4}\\s+|\\n---|\\n\\*\\*|$))`,
        "i"
      );
      const match = body.match(headingRegex);
      if (match && match[1]) {
        const lines = match[1]
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && !l.startsWith(">"));

        if (lines.length > 0) {
          rawValue = lines[0];
          break;
        }
      }
    }
  }

  if (!rawValue) {
    return null;
  }

  // Clean markdown tokens: backticks, brackets, quotes, italic markers
  let cleaned = rawValue
    .replace(/^[`"'\s*~]+|[`"'\s*~]+$/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();

  // Strip leading @ if user prefixed it with @ (e.g. "@ShenSandaru" -> "ShenSandaru")
  if (cleaned.startsWith("@")) {
    cleaned = cleaned.slice(1).trim();
  }

  if (!cleaned) {
    return null;
  }

  // Check if placeholder
  const lower = cleaned.toLowerCase();
  if (INVALID_PLACEHOLDERS.has(lower) || lower.includes("your-discord-username")) {
    return null;
  }

  return cleaned;
}

/**
 * Returns the unique idempotency comment marker for a given PR number.
 */
export function getMergedPRIdempotencyMarker(prNumber: number): string {
  return `<!-- growing-worlds:merged-pr-notification:${prNumber} -->`;
}

export function extractLinkedContributionIssueNumbers(body?: string | null): number[] {
  if (!body || typeof body !== "string") {
    return [];
  }

  const pattern =
    /(?:^|\s|\n|\[|\(|\*\*|\*|__|_|>)\s*(?:close[sd]?|closes|fix(?:e[sd])?|resolve[sd]?)\b\s*(?:\[)?\s*#(\d+)\s*(?:\])?(?=\s|\]|\)|\.|,|:|\*|_|$)/gi;

  const issueNumbers = [...body.matchAll(pattern)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));

  return [...new Set(issueNumbers)];
}

export function isContributionIssue(issue?: ContributionIssueLike | null): boolean {
  if (!issue) {
    return false;
  }

  const title = issue.title ?? "";
  const labels = Array.isArray(issue.labels)
    ? issue.labels.map((label) => (typeof label === "string" ? label : label?.name ?? ""))
    : [];
  const body = issue.body ?? "";

  const hasGoodFirstIssueLabel = labels.some((label) => label.toLowerCase() === "good first issue");
  const hasContributionTitle =
    title.toLowerCase().includes("[good first issue]") ||
    title.toLowerCase().includes("[contrib-slot");
  const hasWorldFields =
    body.toLowerCase().includes("target world") &&
    (body.toLowerCase().includes("contribution slot") || body.toLowerCase().includes("assigned world segment"));

  return hasGoodFirstIssueLabel || hasContributionTitle || hasWorldFields;
}

/**
 * Builds the text and webhook payload for the Discord notification.
 * Format requested:
 * 🎉 **Contribution Merged!**
 *
 * **GitHub:** @<github-username>
 * **Discord:** <discord-username>
 * **PR:** #<pr-number>
 *
 * Thank you for contributing to Growing Worlds!
 */
export function buildMergedNotificationMessage(params: MergedPRNotificationParams): {
  content: string;
  embed: {
    title: string;
    description: string;
    url?: string;
    color: number;
    fields: Array<{ name: string; value: string; inline?: boolean }>;
    footer: { text: string };
  };
} {
  const { githubUsername, prNumber, issueNumber, prUrl } = params;
  const effectiveDiscord = params.discordUsername || "Not provided";

  const contentLines = [
    "🎉 **Contribution Merged!**",
    "",
    `**GitHub:** @${githubUsername}`,
    `**Discord:** ${effectiveDiscord}`,
  ];

  if (typeof issueNumber === "number") {
    contentLines.push(`**Issue:** #${issueNumber}`);
  }

  contentLines.push(`**PR:** #${prNumber}`, "", "Thank you for contributing to Growing Worlds!");

  const content = contentLines.join("\n");

  const fields = [
    { name: "GitHub", value: `[@${githubUsername}](https://github.com/${githubUsername})`, inline: true },
    { name: "Discord", value: effectiveDiscord, inline: true },
  ];

  if (typeof issueNumber === "number") {
    fields.push({ name: "Issue", value: `#${issueNumber}`, inline: true });
  }

  fields.push({ name: "PR", value: prUrl ? `[#${prNumber}](${prUrl})` : `#${prNumber}`, inline: true });

  const embed = {
    title: `🎉 Contribution Merged! #${prNumber}`,
    url: prUrl,
    description: `Thank you **@${githubUsername}** for contributing to **Growing Worlds**! 🌿\nYour paper cutout object is now part of the world diorama.`,
    color: 65280, // Vibrant Green
    fields,
    footer: {
      text: "Growing Worlds • Open source education in action!",
    },
  };

  return {
    content,
    embed,
  };
}

/**
 * Evaluates whether a Discord notification should be sent for a merged PR.
 */
export function shouldSendMergedPRNotification(
  params: MergedPRDecisionParams
): MergedPRDecisionResult {
  if (!params.isMerged) {
    return {
      shouldSend: false,
      reason: "PR is not merged (closed without merge). Skipping notification.",
    };
  }

  if (params.hasIdempotencyMarker) {
    return {
      shouldSend: false,
      reason: "Idempotency marker detected in PR comments. Notification has already been sent.",
    };
  }

  return {
    shouldSend: true,
    reason: "PR is merged and no prior notification has been sent.",
  };
}
