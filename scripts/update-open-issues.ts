/**
 * Modernizes open contribution slot issue descriptions to include the `-<yourName>` ID instruction.
 * Can be executed locally with a GITHUB_TOKEN or automatically via GitHub Actions workflow_dispatch.
 */

export interface ModernizeResult {
  updated: boolean;
  newBody: string;
}

/**
 * Transforms an existing issue body to instruct contributors to add `-<yourName>` to their object ID.
 */
export function modernizeIssueBodyInstruction(body: string): ModernizeResult {
  if (!body) return { updated: false, newBody: body };
  if (body.includes("<yourName>")) return { updated: false, newBody: body };

  let newBody = body;

  // 1. Step 3: id: "slug" -> id: "slug-<yourName>"
  newBody = newBody.replace(
    /id:\s*"([a-z0-9-]+)"(?=[\s\S]*?contributor:)/,
    'id: "$1-<yourName>", // e.g. "$1-alex" (lowercase kebab-case)'
  );

  // 2. Commit 1 message: git commit -m "feat: register slug object" -> feat: register slug-<yourName> object
  newBody = newBody.replace(
    /git commit -m "feat: register ([a-z0-9-]+) object"/,
    'git commit -m "feat: register $1-<yourName> object"'
  );

  // 3. Step 4: objectId: "slug" -> objectId: "slug-<yourName>"
  newBody = newBody.replace(
    /objectId:\s*"([a-z0-9-]+)"/,
    'objectId: "$1-<yourName>"'
  );

  // 4. Commit 2 message: git commit -m "feat: place slug in segment" -> feat: place slug-<yourName> in segment
  newBody = newBody.replace(
    /git commit -m "feat: place ([a-z0-9-]+) in ([a-z0-9-]+)"/,
    'git commit -m "feat: place $1-<yourName> in $2"'
  );

  // 5. Add or update format tip
  const tipText = `\n> 💡 **Object ID Format:** Always add \`-<yourName>\` to your object \`id\` in lowercase kebab-case (e.g. \`"<slug>-alex"\`, \`"<slug>-sewmini"\`). This guarantees your object has a unique identifier and prevents contributor labels from being overwritten. Use that exact matching ID for \`objectId\` in Step 4.\n`;

  if (!newBody.includes("Object ID Format") && newBody.includes("Stage and commit this change:")) {
    newBody = newBody.replace(
      /(```[\r\n]+)(Stage and commit this change:)/,
      `$1${tipText}\n$2`
    );
  }

  return {
    updated: newBody !== body,
    newBody,
  };
}

/**
 * CLI execution when run via `npx tsx scripts/update-open-issues.ts [GITHUB_TOKEN] [REPO_OWNER/REPO_NAME]`
 */
async function main() {
  const token = process.env.GITHUB_TOKEN || process.argv[2];
  const repoSlug = process.env.GITHUB_REPOSITORY || process.argv[3] || "ShenSandaru/MakeYourWorld-OpenCircle";

  if (!token) {
    console.log("ℹ️ Usage: GITHUB_TOKEN=ghp_xxx npx tsx scripts/update-open-issues.ts [GITHUB_TOKEN] [OWNER/REPO]");
    console.log("Alternatively, run the 'Update Open Issues Instruction' GitHub Action in the Actions tab.");
    return;
  }

  const [owner, repo] = repoSlug.split("/");
  if (!owner || !repo) {
    console.error(`❌ Invalid repository format: '${repoSlug}'. Expected 'owner/repo'.`);
    process.exit(1);
  }

  console.log(`🔍 Fetching open 'good first issue' issues from ${owner}/${repo}...`);

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=open&labels=good%20first%20issue&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GrowingWorlds-Issue-Updater",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ Failed to fetch issues: HTTP ${res.status} ${res.statusText}\n${text}`);
      process.exit(1);
    }

    const issues = (await res.json()) as Array<{ number: number; title: string; body: string }>;
    console.log(`Found ${issues.length} open candidate issues.`);

    let updatedCount = 0;
    for (const issue of issues) {
      const { updated, newBody } = modernizeIssueBodyInstruction(issue.body);
      if (updated) {
        console.log(`✏️ Updating Issue #${issue.number}: ${issue.title}...`);
        const patchRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues/${issue.number}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
              "User-Agent": "GrowingWorlds-Issue-Updater",
            },
            body: JSON.stringify({ body: newBody }),
          }
        );

        if (patchRes.ok) {
          console.log(`✅ Issue #${issue.number} successfully updated!`);
          updatedCount++;
        } else {
          console.error(`⚠️ Failed to update #${issue.number}: HTTP ${patchRes.status}`);
        }
      } else {
        console.log(`⏩ Issue #${issue.number} already up-to-date. Skipping.`);
      }
    }

    console.log(`\n🎉 Done! Updated ${updatedCount} issue(s).`);
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    process.exit(1);
  }
}

if (require.main === module || process.argv[1]?.includes("update-open-issues")) {
  main();
}
