# Contributing to Growing Worlds 🌿

Welcome! We are thrilled you want to contribute to **Growing Worlds**.

Growing Worlds is an open-source educational project specifically designed for students and new developers to learn authentic open-source contribution workflows. Every contribution is scoped to a bite-sized Good First Issue (~1–10 meaningful lines of code), and your chosen display name will be permanently rendered in a paper pin badge beneath your object in the shared world!

---

## 🎨 Asset vs. Object vs. Placement (Key Concepts)

Before you write code, understanding these 3 terms makes your contribution simple and straightforward:

1. **Asset (SVG)**: A reusable picture file stored in `public/assets/worlds/<world-id>/`. Think of it as the physical paper stamp. **You reuse an existing asset from the repository—you do NOT need to create or upload a new SVG!**
2. **Object**: A data record in `src/data/worlds/<world-id>/objects.ts` that connects your display name and GitHub username to the chosen existing asset.
3. **Placement**: A record in `src/data/worlds/<world-id>/placements.ts` that defines *where* (assigned `segmentId` and `x, y` percentage coordinates) your object sits in the world.

---

## 🌟 The Minimum 2-Commit Contribution Workflow

Each student contribution follows a clear two-stage workflow:

```
┌────────────────────────────────────────────────────────┐
│  Commit 1: Register Object with Existing Asset         │
│  - Select existing SVG from public/assets/worlds/<id>/ │
│  - Add ~1-5 lines in src/data/worlds/<id>/objects.ts   │
│  - Test with: npm test                                 │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Commit 2: Place Object in World Segment               │
│  - Add ~1-5 lines in src/data/worlds/<id>/placements.ts│
│  - Set assigned segmentId (e.g. "forest-01") & x, y (%)│
│  - Test with: npm test && npm run lint                 │
│  - Check visually at http://localhost:3000/worlds/<id> │
└────────────────────────────────────────────────────────┘
```

> 💡 **Flexible Commit Count**: A **minimum of 2 commits** is required. If you make 3, 4, or 5 commits to fix coordinates, formatting, or comments, that is **100% fine and allowed**! You do not need to squash your commits. CI checks your file boundaries and structure.

---

## 🏷️ Discovery Label Note

- **`good first issue`**: Used on **Issues** to identify available contribution slots for beginner discovery.

---

## 🚀 Quick Step-by-Step Contributor Guide

### 1. Claim a Reusable Issue Slot
- Browse our [Good First Issues](https://github.com/ShenSandaru/OpenCircle-Test/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).
- Find an open **Contribution Slot** that is unassigned.
- Check the issue details for:
  - **Contribution Slot ID**: e.g., `CONTRIB-SLOT #01`
  - **Issue Number**: Note the GitHub issue number (e.g., `#12`) for your PR description.
  - **Target World**: e.g., `Growing Forest` (`growing-forest`)
  - **Target Segment**: e.g., `forest-01`
  - **Suggested Concept**: e.g., `Butterfly`
- Comment on the issue: `Hi! I would like to work on this issue. Thank you! 🙌`
- **Wait for Assignment**: A maintainer will formally assign the issue to you and the automated bot will post your personalized onboarding next-steps comment!
- *Note on Inactivity*: Assigned slots are held for **48 hours**. If no PR is submitted within 48 hours, the slot may be unassigned to give other students an opportunity.

### 2. Fork and Clone
- Click **Fork** at the top-right of the repository on GitHub.
- Clone your fork to your computer:
  ```bash
  git clone https://github.com/<your-username>/MakeYourWorld-OpenCircle.git
  cd MakeYourWorld-OpenCircle
  ```
- Add the upstream repository remote:
  ```bash
  git remote add upstream https://github.com/ShenSandaru/MakeYourWorld-OpenCircle.git
  ```
- Install dependencies:
  ```bash
  npm install
  ```

### 3. Create a Feature Branch from `dev`
Always base your feature branch on the upstream **`dev`** branch (NOT `main`):
```bash
git checkout dev
git fetch upstream
git pull upstream dev
git checkout -b contrib/<world-id>-<object-name>
```
*Example: `git checkout -b contrib/growing-forest-butterfly`*

---

### 4. Commit 1: Register Object with Existing Asset (~1–5 lines)

1. Browse existing paper-cutout SVGs in:
   `public/assets/worlds/<world-id>/`
   *(Example: choose `public/assets/worlds/growing-forest/student-butterfly.svg`)*
2. Open `src/data/worlds/<world-id>/objects.ts` and append your object to the array:
   ```typescript
   {
     id: "butterfly",
     asset: "/assets/worlds/growing-forest/student-butterfly.svg",
      contributor: {
        displayName: "Your Name",
        githubUsername: "your-github-username",
      },
    },
   ```

    > 💡 **Object ID Uniqueness**: If an object with `id: "butterfly"` already exists in `objects.ts` (e.g. added by another contributor), ensure your ID is unique by appending a suffix or your username (e.g. `"butterfly-<your-username>"` or `"canopy-butterfly"`). Then use that exact matching ID for `objectId` in Commit 2.

3. Check status and create **Commit 1**:
   ```bash
   git status
   git diff
   git add src/data/worlds/<world-id>/objects.ts
   git commit -m "feat: register butterfly object"
   ```

---

### 5. Commit 2: World Placement (~1–5 lines)

1. Open `src/data/worlds/<world-id>/placements.ts`.
2. Append your placement entry specifying your assigned `segmentId` and coordinates `x` (0–100%) and `y` (0–100%):
   ```typescript
   {
     objectId: "butterfly",
     segmentId: "forest-01",
     x: 62.0,
     y: 42.0,
     scale: 1.0,
     rotation: -4,
   },
   ```
3. Check status and create **Commit 2**:
   ```bash
   git status
   git diff
   git add src/data/worlds/<world-id>/placements.ts
   git commit -m "feat: place butterfly in forest-01"
   ```

4. Verify your commits:
   ```bash
   git log --oneline -5
   ```

5. Run local validation:
   ```bash
   npm test
   npm run lint
   npm run typecheck
   npm run build
   npx tsx scripts/audit-integrity.ts
   ```

6. View it locally in your browser:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000/worlds/<world-id>` to visually check your placed object and contributor badge.

---

### 6. Submit Your Pull Request

1. Push your feature branch to your fork:
   ```bash
   git push -u origin contrib/<world-id>-<object-name>
   ```
2. Go to GitHub and open a Pull Request against the **`dev`** branch (NOT `main`).
3. In the PR description, include `Closes #<ASSIGNED_ISSUE_NUMBER>` (e.g. `Closes #12`).
4. Once reviewed and merged by maintainers into `dev`, your contribution permanently appears in the growing world! 🎉
5. The completed issue will automatically close, and a fresh issue will be automatically created to keep the 20-slot pool replenished.

---

## 🛑 Contributor File Boundaries

To ensure clean validation, student contributors must **only** edit:
- ✅ `src/data/worlds/<world-id>/objects.ts` (Commit 1)
- ✅ `src/data/worlds/<world-id>/placements.ts` (Commit 2)

Do **NOT** modify existing SVG asset files in `public/assets/`, engine code (`src/engine/*`), domain schemas (`src/schemas/*`), UI components (`src/components/*`), pages (`src/app/*`), tests (`tests/*`), workflows (`.github/*`), documentation (`docs/*`), scripts (`scripts/*`), or dependency files (`package.json`, `package-lock.json`).

---

## 🛠️ Troubleshooting CI Failures

- **"At least 2 commits are required"**: Ensure your changes are split across at least 2 commits (Commit 1 for `objects.ts`, Commit 2 for `placements.ts`).
- **"Unexpected asset modification"**: You modified an SVG in `public/assets/`. Revert it using `git checkout -- public/assets/` and simply reference the file path from `objects.ts`.
- **"Forbidden file modified"**: You changed files outside your assigned world. Revert unrelated files so only `objects.ts` and `placements.ts` are modified.

---

## 📄 Contributor Licensing

By submitting a Pull Request to **Growing Worlds**, you confirm that:
1. You have the legal right to submit your contribution.
2. Your contribution is distributed under the repository's [MIT License](LICENSE).
3. You have not included third-party material without compatible open-source licensing or required attribution.
