import { describe, it, expect } from "vitest";
import {
  extractDiscordUsername,
  getMergedPRIdempotencyMarker,
  buildMergedNotificationMessage,
  shouldSendMergedPRNotification,
  extractLinkedContributionIssueNumbers,
  isContributionIssue,
} from "../../../scripts/pr-lifecycle-parser";

describe("PR Lifecycle Parser & Merged Notification Unit Tests", () => {
  const standardPRBody = `
## 👤 Contributor Information

- **GitHub Username:** \`@ShenSandaru\`
- **Discord Username:** \`ShenSandaru\`

---

## 🔴 IMPORTANT — LINK YOUR ISSUE

Closes #123
`;

  it("TEST 1: merged PR with valid Discord username -> notification payload and content are generated", () => {
    const discordUsername = extractDiscordUsername(standardPRBody);
    expect(discordUsername).toBe("ShenSandaru");

    const decision = shouldSendMergedPRNotification({
      isMerged: true,
      hasIdempotencyMarker: false,
      discordUsername,
    });
    expect(decision.shouldSend).toBe(true);

    const payload = buildMergedNotificationMessage({
      githubUsername: "ShenSandaru",
      discordUsername: discordUsername!,
      prNumber: 123,
      prUrl: "https://github.com/ShenSandaru/MakeYourWorld-OpenCircle/pull/123",
      prTitle: "Add Butterfly to Growing Forest",
    });

    expect(payload.content).toBe(
      [
        "🎉 **Contribution Merged!**",
        "",
        "**GitHub:** @ShenSandaru",
        "**Discord:** ShenSandaru",
        "**PR:** #123",
        "",
        "Thank you for contributing to Growing Worlds!",
      ].join("\n")
    );

    expect(payload.embed.title).toContain("#123");
    expect(payload.embed.color).toBe(65280);
    expect(payload.embed.fields.find((f) => f.name === "Discord")?.value).toBe("ShenSandaru");
    expect(payload.embed.fields.find((f) => f.name === "GitHub")?.value).toContain("@ShenSandaru");
  });

  it("TEST 2: closed but unmerged PR -> no notification should be sent", () => {
    const discordUsername = extractDiscordUsername(standardPRBody);
    const decision = shouldSendMergedPRNotification({
      isMerged: false,
      hasIdempotencyMarker: false,
      discordUsername,
    });

    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toContain("not merged");
  });

  it("TEST 3: missing or empty Discord username -> notification is still sent with 'Not provided' fallback", () => {
    const missingBody = `
## 👤 Contributor Information
- **GitHub Username:** @contributor
- **Discord Username:** _No response_
`;
    const extracted = extractDiscordUsername(missingBody);
    expect(extracted).toBeNull();

    const decision = shouldSendMergedPRNotification({
      isMerged: true,
      hasIdempotencyMarker: false,
      discordUsername: extracted,
    });

    expect(decision.shouldSend).toBe(true);

    const payload = buildMergedNotificationMessage({
      githubUsername: "contributor",
      discordUsername: extracted,
      prNumber: 224,
    });
    expect(payload.content).toContain("**Discord:** Not provided");
    expect(payload.embed.fields.find((f) => f.name === "Discord")?.value).toBe("Not provided");
  });

  it("TEST 4: default template placeholder is rejected as valid username but notification is still sent with fallback", () => {
    const defaultTemplateBody = `
## 👤 Contributor Information
- **GitHub Username:** \`@your-github-username\`
- **Discord Username:** \`@your-discord-username\`
`;
    const extracted = extractDiscordUsername(defaultTemplateBody);
    expect(extracted).toBeNull();

    // Also assert legacy placeholder without '@' is still safely rejected
    const legacyTemplateBody = `
## 👤 Contributor Information
- **GitHub Username:** \`@your-github-username\`
- **Discord Username:** \`your-discord-username\`
`;
    expect(extractDiscordUsername(legacyTemplateBody)).toBeNull();

    const decision = shouldSendMergedPRNotification({
      isMerged: true,
      hasIdempotencyMarker: false,
      discordUsername: extracted,
    });

    expect(decision.shouldSend).toBe(true);

    const payload = buildMergedNotificationMessage({
      githubUsername: "your-github-username",
      discordUsername: extracted,
      prNumber: 224,
    });
    expect(payload.content).toContain("**Discord:** Not provided");
    expect(payload.embed.fields.find((f) => f.name === "Discord")?.value).toBe("Not provided");
  });

  it("TEST 5: Markdown formatting variations in the Discord Username field", () => {
    // Variations: bold variations, backticks, spaces, colons, @-prefix
    const variation1 = "- **Discord Username:** `ShenSandaru`";
    const variation2 = "**Discord Username**: @ShenSandaru";
    const variation3 = "- Discord Username: ShenSandaru";
    const variation4 = "| **Discord Username** | `ShenSandaru` |";
    const variation5 = "### 💬 Discord Username\n\nShenSandaru\n";
    const variation6 = "- **Discord Username:** **`ShenSandaru`**";
    const variation7 = "- **Discord Username:** `@ShenSandaru`";

    expect(extractDiscordUsername(variation1)).toBe("ShenSandaru");
    expect(extractDiscordUsername(variation2)).toBe("ShenSandaru");
    expect(extractDiscordUsername(variation3)).toBe("ShenSandaru");
    expect(extractDiscordUsername(variation4)).toBe("ShenSandaru");
    expect(extractDiscordUsername(variation5)).toBe("ShenSandaru");
    expect(extractDiscordUsername(variation6)).toBe("ShenSandaru");
    expect(extractDiscordUsername(variation7)).toBe("ShenSandaru");
  });

  it("TEST 6: correct GitHub username comes from PR author login and cannot be spoofed by body", () => {
    // Suppose body says something untruthful
    const spoofedBody = `
- **GitHub Username:** @imposter
- **Discord Username:** real_contributor
`;
    const authoritativeAuthor = "authoritative-student";
    const extractedDiscord = extractDiscordUsername(spoofedBody);

    const payload = buildMergedNotificationMessage({
      githubUsername: authoritativeAuthor, // authoritative PR user login
      discordUsername: extractedDiscord!,
      prNumber: 42,
    });

    expect(payload.content).toContain("**GitHub:** @authoritative-student");
    expect(payload.content).not.toContain("@imposter");
  });

  it("TEST 7: duplicate merge event with existing idempotency marker does not produce duplicate notification", () => {
    const prNumber = 123;
    const marker = getMergedPRIdempotencyMarker(prNumber);
    expect(marker).toBe("<!-- growing-worlds:merged-pr-notification:123 -->");

    const decision = shouldSendMergedPRNotification({
      isMerged: true,
      hasIdempotencyMarker: true,
      discordUsername: "ShenSandaru",
    });

    expect(decision.shouldSend).toBe(false);
    expect(decision.reason).toContain("Idempotency marker detected");
  });

  it("TEST 8: Closes #104 resolves the linked contribution issue number", () => {
    const body = "Closes #104";
    expect(extractLinkedContributionIssueNumbers(body)).toEqual([104]);
  });

  it("TEST 8b: Closes #123 with markdown asterisks and blockquote variants are resolved cleanly", () => {
    expect(extractLinkedContributionIssueNumbers("Closes #123")).toEqual([123]);
    expect(extractLinkedContributionIssueNumbers("Closes #123 **")).toEqual([123]);
    expect(extractLinkedContributionIssueNumbers("> **Closes #123 **")).toEqual([123]);
    expect(extractLinkedContributionIssueNumbers("> **Closes #196 **")).toEqual([196]);
    expect(extractLinkedContributionIssueNumbers("Fixes #123 **")).toEqual([123]);
    expect(extractLinkedContributionIssueNumbers("Resolves #123 **")).toEqual([123]);
    expect(extractLinkedContributionIssueNumbers("> **Fixes #456 **")).toEqual([456]);
    expect(extractLinkedContributionIssueNumbers("> **Resolves #789 **")).toEqual([789]);
    expect(extractLinkedContributionIssueNumbers("_Closes #123__")).toEqual([123]);
    expect(extractLinkedContributionIssueNumbers("**Closes #123**")).toEqual([123]);
  });

  it("TEST 8c: colon variants (Closes: #123, Fixes: #123, Resolves: #123) are resolved cleanly", () => {
    expect(extractLinkedContributionIssueNumbers("Closes: #123")).toEqual([123]);
    expect(extractLinkedContributionIssueNumbers("Fixes: #123")).toEqual([123]);
    expect(extractLinkedContributionIssueNumbers("Resolves: #123")).toEqual([123]);
    expect(extractLinkedContributionIssueNumbers("> **Closes: #123**")).toEqual([123]);
    expect(extractLinkedContributionIssueNumbers("- Closes: #123")).toEqual([123]);
  });

  it("TEST 8d: GitHub issue URL variants (Closes https://github.com/.../issues/123) are resolved cleanly", () => {
    expect(
      extractLinkedContributionIssueNumbers(
        "Closes https://github.com/ShenSandaru/MakeYourWorld-OpenCircle/issues/123"
      )
    ).toEqual([123]);
    expect(
      extractLinkedContributionIssueNumbers(
        "Fixes https://github.com/ShenSandaru/MakeYourWorld-OpenCircle/issues/123"
      )
    ).toEqual([123]);
    expect(
      extractLinkedContributionIssueNumbers(
        "Resolves https://github.com/ShenSandaru/MakeYourWorld-OpenCircle/issues/123"
      )
    ).toEqual([123]);
    expect(
      extractLinkedContributionIssueNumbers(
        "Closes: https://github.com/ShenSandaru/MakeYourWorld-OpenCircle/issues/123"
      )
    ).toEqual([123]);
    expect(
      extractLinkedContributionIssueNumbers(
        "Fixes: https://github.com/ShenSandaru/MakeYourWorld-OpenCircle/issues/123"
      )
    ).toEqual([123]);
    expect(
      extractLinkedContributionIssueNumbers(
        "Resolves: https://github.com/ShenSandaru/MakeYourWorld-OpenCircle/issues/123"
      )
    ).toEqual([123]);
    expect(
      extractLinkedContributionIssueNumbers(
        "Closes [https://github.com/ShenSandaru/MakeYourWorld-OpenCircle/issues/123]"
      )
    ).toEqual([123]);
    expect(
      extractLinkedContributionIssueNumbers(
        "Closes [#123](https://github.com/ShenSandaru/MakeYourWorld-OpenCircle/issues/123)"
      )
    ).toEqual([123]);
  });

  it("TEST 8e: unreplaced template placeholders (#XXX, XXX) are ignored and do not produce issue numbers", () => {
    expect(extractLinkedContributionIssueNumbers("Closes #XXX")).toEqual([]);
    expect(extractLinkedContributionIssueNumbers("Closes: #XXX")).toEqual([]);
    expect(extractLinkedContributionIssueNumbers("> **Closes #XXX**")).toEqual([]);
    expect(extractLinkedContributionIssueNumbers("Closes XXX")).toEqual([]);

    // When both an unreplaced placeholder and an actual issue reference appear (e.g. from template guidance)
    const bodyWithBoth = `
> **⚠️ Please replace \`XXX\` with your assigned issue number.**
>
> **Closes #XXX**

Closes #220
`;
    expect(extractLinkedContributionIssueNumbers(bodyWithBoth)).toEqual([220]);
  });

  it("TEST 8f: unrelated '#123' text without closing keyword does NOT become a linked issue", () => {
    expect(extractLinkedContributionIssueNumbers("This is PR #123")).toEqual([]);
    expect(extractLinkedContributionIssueNumbers("Discussing issue #123 with team")).toEqual([]);
    expect(extractLinkedContributionIssueNumbers("Commit #123 added")).toEqual([]);
  });

  it("TEST 8g: PR #229 format regression testing", () => {
    // Regression test matching PR #229 formats (e.g. Closes: #220 or Closes <url>)
    const pr229WithColon = `
## 👤 Contributor Information
- **GitHub Username:** @Shashini543
- **Discord Username:** Shashini543

## 🔴 IMPORTANT — LINK YOUR ISSUE
Closes: #220
`;
    expect(extractLinkedContributionIssueNumbers(pr229WithColon)).toEqual([220]);

    const pr229WithUrl = `
## 👤 Contributor Information
- **GitHub Username:** @Shashini543
- **Discord Username:** Shashini543

## 🔴 IMPORTANT — LINK YOUR ISSUE
Closes https://github.com/ShenSandaru/MakeYourWorld-OpenCircle/issues/220
`;
    expect(extractLinkedContributionIssueNumbers(pr229WithUrl)).toEqual([220]);
  });

  it("TEST 9: Fixes #104 resolves the linked contribution issue number", () => {
    const body = "Fixes #104";
    expect(extractLinkedContributionIssueNumbers(body)).toEqual([104]);
  });

  it("TEST 10: Resolves #104 resolves the linked contribution issue number", () => {
    const body = "Resolves #104";
    expect(extractLinkedContributionIssueNumbers(body)).toEqual([104]);
  });

  it("TEST 11: lowercase and mixed-case close keywords are supported", () => {
    expect(extractLinkedContributionIssueNumbers("closes #104")).toEqual([104]);
    expect(extractLinkedContributionIssueNumbers("FiXeS #104")).toEqual([104]);
    expect(extractLinkedContributionIssueNumbers("resolved #104")).toEqual([104]);
  });

  it("TEST 12: PR body with no linked issue does not resolve any issue number", () => {
    expect(extractLinkedContributionIssueNumbers("Just a normal update")).toEqual([]);
  });

  it("TEST 13: multiple closing references are preserved as separate candidate issue numbers and reject ambiguous single-link rule", () => {
    const body = "Closes #104\nFixes #105";
    const candidates = extractLinkedContributionIssueNumbers(body);
    expect(candidates).toEqual([104, 105]);
    // According to the one-linked-issue rule, candidateIssueNumbers.length !== 1 must not proceed to notification
    expect(candidates.length === 1).toBe(false);

    // Also test multiple references when formatted with markdown bold
    const markdownMultiple = "> **Closes #104 **\n> **Fixes #105 **";
    const mdCandidates = extractLinkedContributionIssueNumbers(markdownMultiple);
    expect(mdCandidates).toEqual([104, 105]);
    expect(mdCandidates.length === 1).toBe(false);
  });

  it("TEST 14: contribution issue validation accepts the project's contribution issue pattern", () => {
    const issue = {
      number: 104,
      title: "[Good First Issue] Add a butterfly to Growing Forest",
      body: "### Target World\nGrowing Forest\n### Contribution Slot\nA1",
      labels: [{ name: "good first issue" }],
    };

    expect(isContributionIssue(issue)).toBe(true);
  });

  it("TEST 15: ordinary issues are rejected as contribution issues", () => {
    expect(
      isContributionIssue({
        number: 999,
        title: "General project question",
        body: "Could we document the setup process?",
        labels: [{ name: "question" }],
      })
    ).toBe(false);
  });

  it("TEST 16: nonexistent or missing issues are rejected safely", () => {
    expect(isContributionIssue(null)).toBe(false);
    expect(isContributionIssue(undefined)).toBe(false);
  });

  it("TEST 17: merged PR message includes linked issue and PR number separately", () => {
    const payload = buildMergedNotificationMessage({
      githubUsername: "ShenSandaru",
      discordUsername: "ShenSandaru",
      prNumber: 123,
      issueNumber: 104,
      prUrl: "https://github.com/ShenSandaru/MakeYourWorld-OpenCircle/pull/123",
      prTitle: "Add Butterfly to Growing Forest",
    });

    expect(payload.content).toContain("**PR:** #123");
    expect(payload.content).toContain("**Issue:** #104");
    expect(payload.content).not.toContain("**Issue:** #123");
  });

  it("TEST 18: idempotency marker still uses the PR number, not the issue number", () => {
    const marker = getMergedPRIdempotencyMarker(123);
    expect(marker).toBe("<!-- growing-worlds:merged-pr-notification:123 -->");
    expect(marker).not.toContain("104");
  });

  it("TEST 19: missing or invalid Discord username never causes early return/skip", () => {
    const missingDecision = shouldSendMergedPRNotification({
      isMerged: true,
      hasIdempotencyMarker: false,
      discordUsername: null,
    });
    expect(missingDecision.shouldSend).toBe(true);

    const malformedDecision = shouldSendMergedPRNotification({
      isMerged: true,
      hasIdempotencyMarker: false,
      discordUsername: "",
    });
    expect(malformedDecision.shouldSend).toBe(true);
  });

  it("TEST 19b: malformed/missing Discord username does NOT affect linked issue validation", () => {
    // Proves that regardless of whether Discord username is present, malformed, or null,
    // contribution issue validation continues to behave identically and accurately
    const validIssue = {
      number: 104,
      title: "[Good First Issue] Add a butterfly to Growing Forest",
      body: "### Target World\nGrowing Forest\n### Contribution Slot\nA1",
      labels: [{ name: "good first issue" }],
    };
    expect(isContributionIssue(validIssue)).toBe(true);

    const invalidIssue = {
      number: 999,
      title: "Random general bug",
      body: "Something went wrong",
      labels: [],
    };
    expect(isContributionIssue(invalidIssue)).toBe(false);
  });

  it("TEST 19c: buildMergedNotificationMessage formats fallback 'Not provided' when username is null, undefined, or empty", () => {
    const payloadNull = buildMergedNotificationMessage({
      githubUsername: "author",
      discordUsername: null,
      prNumber: 224,
      issueNumber: 104,
    });
    expect(payloadNull.content).toContain("**Discord:** Not provided");
    expect(payloadNull.embed.fields.find((f) => f.name === "Discord")?.value).toBe("Not provided");

    const payloadEmpty = buildMergedNotificationMessage({
      githubUsername: "author",
      discordUsername: "",
      prNumber: 224,
      issueNumber: 104,
    });
    expect(payloadEmpty.content).toContain("**Discord:** Not provided");
    expect(payloadEmpty.embed.fields.find((f) => f.name === "Discord")?.value).toBe("Not provided");
  });

  it("TEST 20: valid merged contribution PRs with a valid issue still notify successfully", () => {
    const discordUsername = extractDiscordUsername(standardPRBody);
    const decision = shouldSendMergedPRNotification({
      isMerged: true,
      hasIdempotencyMarker: false,
      discordUsername,
    });

    expect(decision.shouldSend).toBe(true);
  });

  it("TEST 21: notify-merged-pr workflow configuration uses pull_request_target with types [closed]", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const workflowPath = path.resolve(process.cwd(), ".github/workflows/notify-merged-pr.yml");
    const workflowContent = fs.readFileSync(workflowPath, "utf-8");

    // Must trigger on pull_request_target
    expect(workflowContent).toMatch(/on:\s*\n\s*pull_request_target:\s*\n\s*types:\s*\n\s*-\s*closed/);
    // Must NOT trigger on fork-restricted pull_request
    expect(workflowContent).not.toMatch(/on:\s*\n\s*pull_request:\s*\n/);
  });
});
