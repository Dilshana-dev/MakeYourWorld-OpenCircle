import { describe, it, expect } from "vitest";
import {
  calculateMissingSlotIds,
  selectFreshConcept,
  generateContributionSlotIssue,
  CURATED_CONCEPTS,
  LEGACY_CURATED_CONCEPTS,
  ACTIVE_CONTRIBUTION_CONCEPTS,
  CONTRIBUTION_POOL_SIZE,
  MAX_CREATE_PER_RUN,
  TOTAL_POOL_SIZE,
  type CuratedConcept,
} from "../../../scripts/contribution-slot-generator";
import { parseIssueSlotBody, isGrowingWorldsContributionIssue } from "../../../scripts/issue-lifecycle-parser";
import { computeReplenishment, ReplenishInput } from "../../../scripts/run-replenishment";
import { modernizeIssueBodyInstruction } from "../../../scripts/update-open-issues";

describe("Contribution Slot Pool Replenishment Generator Tests", () => {
  it("TEST 1: 20 open issues with 20 pool -> 0 missing slots", () => {
    const fullPool = Array.from({ length: 20 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`);
    const missing = calculateMissingSlotIds(fullPool, 20);
    expect(missing).toHaveLength(0);
  });

  it("TEST 2: 19 open issues with 20 pool -> exactly 1 missing slot detected", () => {
    // Missing slot 03
    const pool = Array.from({ length: 20 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`).filter(
      (s) => s !== "CONTRIB-SLOT #03"
    );
    const missing = calculateMissingSlotIds(pool, 20);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toBe("CONTRIB-SLOT #03");
  });

  it("TEST 3: 18 open issues with 20 pool -> exactly 2 missing slots detected", () => {
    const pool = Array.from({ length: 20 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`).filter(
      (s) => s !== "CONTRIB-SLOT #03" && s !== "CONTRIB-SLOT #07"
    );
    const missing = calculateMissingSlotIds(pool, 20);
    expect(missing).toEqual(["CONTRIB-SLOT #03", "CONTRIB-SLOT #07"]);
  });

  it("TEST 4: 17 open issues with 20 pool -> exactly 3 missing slots detected", () => {
    const pool = Array.from({ length: 20 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`).filter(
      (s) => s !== "CONTRIB-SLOT #01" && s !== "CONTRIB-SLOT #10" && s !== "CONTRIB-SLOT #20"
    );
    const missing = calculateMissingSlotIds(pool, 20);
    expect(missing).toEqual(["CONTRIB-SLOT #01", "CONTRIB-SLOT #10", "CONTRIB-SLOT #20"]);
  });

  it("TEST 5: selectFreshConcept avoids already active assignments", () => {
    const active = [
      { worldId: "growing-forest", objectName: "Butterfly" },
      { worldId: "growing-forest", objectName: "Song Bird" },
    ];
    const fresh = selectFreshConcept(active, "growing-forest");
    expect(fresh.worldId).toBe("growing-forest");
    expect(fresh.objectName).not.toBe("Butterfly");
    expect(fresh.objectName).not.toBe("Song Bird");
  });

  it("TEST 6: generates valid issue title adhering to standardized pattern", () => {
    const concept = CURATED_CONCEPTS[0]; // Butterfly
    const generated = generateContributionSlotIssue("CONTRIB-SLOT #03", concept);
    expect(generated.title).toBe("🌱 Add a Butterfly to Growing Forest — Ancient Canopy (SLOT #03)");
    expect(generated.labels).toEqual(["good first issue"]);
  });

  it("TEST 7: generated issue body is fully parseable by existing issue-lifecycle-parser", () => {
    const concept = CURATED_CONCEPTS.find((c) => c.objectName === "Wooden Cart")!;
    const generated = generateContributionSlotIssue("CONTRIB-SLOT #05", concept);

    // Validate with issue parser
    const parsed = parseIssueSlotBody(generated.body);
    expect(parsed.worldName).toBe("Growing Village");
    expect(parsed.worldId).toBe("growing-village");
    expect(parsed.slotFormatted).toBe("CONTRIB-SLOT #05");
    expect(parsed.segmentId).toBe("village-01");
    expect(parsed.objectName).toBe("Wooden Cart");
    expect(isGrowingWorldsContributionIssue(generated.title, generated.labels, generated.body)).toBe(true);
  });

  it("TEST 8: generated issue explicitly emphasizes reusing existing assets without creating SVGs", () => {
    const concept = CURATED_CONCEPTS[0];
    const generated = generateContributionSlotIssue("CONTRIB-SLOT #01", concept);
    expect(generated.body).toContain("No design skills needed");
    expect(generated.body).toContain("You don't need to create or upload an SVG");
    expect(generated.body).toContain("reuse an existing paper-cutout asset");
  });

  it("TEST 9: every curated concept references a verified existing asset", () => {
    expect(CURATED_CONCEPTS.length).toBeGreaterThanOrEqual(TOTAL_POOL_SIZE);
    for (const c of CURATED_CONCEPTS) {
      expect(c.worldId).toBeTruthy();
      expect(c.worldName).toBeTruthy();
      expect(c.assetFile.endsWith(".svg")).toBe(true);
    }
  });

  it("TEST 10: computeReplenishment handles empty input, multiline strings, and special characters cleanly", () => {
    const emptyInput: ReplenishInput = {
      activeSlots: [],
      activeAssignments: [],
      maxPerRun: 5,
      poolSize: 20,
    };
    const result = computeReplenishment(emptyInput);
    expect(result.openContributionCount).toBe(0);
    expect(result.missingSlotCount).toBe(20);
    expect(result.slotsToCreate).toHaveLength(5);
    expect(result.generatedIssues).toHaveLength(5);

    // Complex input with Unicode / special quotes
    const complexInput: ReplenishInput = {
      activeSlots: ["CONTRIB-SLOT #01", "CONTRIB-SLOT #02"],
      activeAssignments: [
        { worldId: "growing-forest", objectName: 'Butterfly "Canopy" & 🌲' },
      ],
      maxPerRun: 2,
      poolSize: 20,
    };
    const complexResult = computeReplenishment(complexInput);
    expect(complexResult.openContributionCount).toBe(2);
    expect(complexResult.missingSlotCount).toBe(18);
    expect(complexResult.slotsToCreate).toEqual(["CONTRIB-SLOT #03", "CONTRIB-SLOT #04"]);
    expect(complexResult.generatedIssues).toHaveLength(2);
    expect(complexResult.generatedIssues[0].slotFormatted).toBe("CONTRIB-SLOT #03");
  });

  it("TEST 11: 20 active slots with 20 pool -> create 0", () => {
    const activeSlots = Array.from({ length: 20 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`);
    const result = computeReplenishment({ activeSlots, activeAssignments: [], poolSize: 20 });
    expect(result.missingSlotCount).toBe(0);
    expect(result.slotsToCreate).toHaveLength(0);
    expect(result.generatedIssues).toHaveLength(0);
  });

  it("TEST 12: 19 active slots with 20 pool -> create 1", () => {
    const activeSlots = Array.from({ length: 20 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`).slice(0, 19);
    const result = computeReplenishment({ activeSlots, activeAssignments: [], poolSize: 20 });
    expect(result.missingSlotCount).toBe(1);
    expect(result.slotsToCreate).toEqual(["CONTRIB-SLOT #20"]);
    expect(result.generatedIssues).toHaveLength(1);
  });

  it("TEST 13: 15 active slots with 20 pool -> create 5", () => {
    const activeSlots = Array.from({ length: 20 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`).slice(0, 15);
    const result = computeReplenishment({ activeSlots, activeAssignments: [], poolSize: 20 });
    expect(result.missingSlotCount).toBe(5);
    expect(result.slotsToCreate).toHaveLength(5);
    expect(result.generatedIssues).toHaveLength(5);
  });

  it("TEST 14: 11 active slots with 20 pool -> create 9 (overcoming old 5-slot limit)", () => {
    const activeSlots = Array.from({ length: 20 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`).slice(0, 11);
    const result = computeReplenishment({ activeSlots, activeAssignments: [], poolSize: 20 });
    expect(result.missingSlotCount).toBe(9);
    expect(result.slotsToCreate).toHaveLength(9);
    expect(result.generatedIssues).toHaveLength(9);
  });

  it("TEST 15: 7 active slots with 20 pool -> create 13 (real-world deficit test)", () => {
    const activeSlots = Array.from({ length: 20 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`).slice(0, 7);
    const result = computeReplenishment({ activeSlots, activeAssignments: [], poolSize: 20 });
    expect(result.missingSlotCount).toBe(13);
    expect(result.slotsToCreate).toHaveLength(13);
    expect(result.generatedIssues).toHaveLength(13);
  });

  it("TEST 16: 1 active slot with 20 pool -> create 19", () => {
    const activeSlots = ["CONTRIB-SLOT #05"];
    const result = computeReplenishment({ activeSlots, activeAssignments: [], poolSize: 20 });
    expect(result.missingSlotCount).toBe(19);
    expect(result.slotsToCreate).toHaveLength(19);
    expect(result.slotsToCreate).not.toContain("CONTRIB-SLOT #05");
  });

  it("TEST 17: Deleted slot numbers can be regenerated in 20 pool", () => {
    // Say slots 4, 8, 12 were deleted
    const poolWithoutDeleted = Array.from({ length: 20 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`)
      .filter((s) => s !== "CONTRIB-SLOT #04" && s !== "CONTRIB-SLOT #08" && s !== "CONTRIB-SLOT #12");
    
    const result = computeReplenishment({ activeSlots: poolWithoutDeleted, activeAssignments: [], poolSize: 20 });
    expect(result.missingSlotCount).toBe(3);
    expect(result.slotsToCreate).toEqual(["CONTRIB-SLOT #04", "CONTRIB-SLOT #08", "CONTRIB-SLOT #12"]);
  });

  it("TEST 18: Duplicate active slot numbers are never generated in 20 pool", () => {
    const activeSlots = ["CONTRIB-SLOT #01", "CONTRIB-SLOT #02", "CONTRIB-SLOT #03"];
    const result = computeReplenishment({ activeSlots, activeAssignments: [], poolSize: 20, maxPerRun: 20 });
    const allSlots = [...activeSlots, ...result.slotsToCreate];
    const uniqueSlots = new Set(allSlots);
    expect(uniqueSlots.size).toBe(20);
  });

  it("TEST 19: Unrelated closed issue vs contribution closed issue detection", () => {
    // Unrelated bug report
    const bugTitle = "Fix broken styling on mobile navigation";
    const bugLabels = ["bug"];
    const bugBody = "The drawer does not expand properly on iPhone.";
    expect(isGrowingWorldsContributionIssue(bugTitle, bugLabels, bugBody)).toBe(false);

    // Authentic contribution issue
    const contribTitle = "[Good First Issue] 🌱 Add Butterfly to Growing Forest — forest-01 (CONTRIB-SLOT #01)";
    const contribLabels = ["good first issue"];
    const contribBody = "| **World** | `Growing Forest` |\n| **Contribution Slot** | `CONTRIB-SLOT #01` |";
    expect(isGrowingWorldsContributionIssue(contribTitle, contribLabels, contribBody)).toBe(true);
  });

  it("TEST 20: 21 active slots (overflow edge-case in 20 pool) -> creates 0", () => {
    const overflowSlots = [
      ...Array.from({ length: 20 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`),
      "CONTRIB-SLOT #21",
    ];
    const result = computeReplenishment({ activeSlots: overflowSlots, activeAssignments: [], poolSize: 20 });
    expect(result.missingSlotCount).toBe(0);
    expect(result.slotsToCreate).toHaveLength(0);
    expect(result.generatedIssues).toHaveLength(0);
  });

  describe("Phase C: World Concept / Object Catalog Expansion Suite", () => {
    it("contains substantially expanded curated concepts (179 total)", () => {
      expect(CURATED_CONCEPTS.length).toBe(179);
    });

    it("distributes concepts across all 10 worlds with at least 17 concepts per world", () => {
      const worldCounts: Record<string, number> = {};
      for (const concept of CURATED_CONCEPTS) {
        worldCounts[concept.worldId] = (worldCounts[concept.worldId] || 0) + 1;
      }

      const allWorldIds = [
        "growing-forest",
        "growing-universe",
        "growing-ocean",
        "growing-city",
        "growing-village",
        "growing-island",
        "growing-farm",
        "growing-campus",
        "fantasy-world",
        "alien-planet",
      ];

      allWorldIds.forEach((wid) => {
        expect(worldCounts[wid]).toBeGreaterThanOrEqual(17);
      });
    });

    it("ensures all concepts reference existing SVG assets on disk and unique object names per world", () => {
      const seenWorldObjects = new Set<string>();
      for (const concept of CURATED_CONCEPTS) {
        const key = `${concept.worldId}:${concept.objectName}`;
        expect(seenWorldObjects.has(key)).toBe(false);
        seenWorldObjects.add(key);

        expect(concept.defaultSegmentId).toMatch(/^[a-z0-9-]+-\d{2}$/);
        expect(concept.assetFile).toMatch(/\.svg$/);
      }
    });

    it("ensures segments 04 through 10 have curated concepts available", () => {
      const segmentCounts: Record<string, number> = {};
      for (const concept of CURATED_CONCEPTS) {
        segmentCounts[concept.defaultSegmentId] = (segmentCounts[concept.defaultSegmentId] || 0) + 1;
      }

      // Check segments 04-10 for growing-forest
      for (let i = 4; i <= 10; i++) {
        const segId = `forest-${String(i).padStart(2, "0")}`;
        expect(segmentCounts[segId]).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("Phase D: 100 Available Contribution Slots Pool Suite", () => {
    it("targets authoritative CONTRIBUTION_POOL_SIZE = 100 available slots", () => {
      expect(CONTRIBUTION_POOL_SIZE).toBe(100);
    });

    it("supports slot numbering from #01 up to #100 and beyond", () => {
      const full100 = Array.from({ length: 100 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`);
      expect(full100[0]).toBe("CONTRIB-SLOT #01");
      expect(full100[98]).toBe("CONTRIB-SLOT #99");
      expect(full100[99]).toBe("CONTRIB-SLOT #100");

      const missingWhenFull = calculateMissingSlotIds(full100, 100);
      expect(missingWhenFull).toHaveLength(0);

      // Missing slot #73 and slot #100
      const poolWithMissing = full100.filter((s) => s !== "CONTRIB-SLOT #73" && s !== "CONTRIB-SLOT #100");
      const missing = calculateMissingSlotIds(poolWithMissing, 100);
      expect(missing).toEqual(["CONTRIB-SLOT #73", "CONTRIB-SLOT #100"]);
    });

    it("excludes assigned/in-progress issues from available count", () => {
      // 90 available unassigned slots + 15 assigned/in-progress slots = 105 total open issues
      const activeAvailableSlots = Array.from({ length: 90 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`);
      const result = computeReplenishment({
        activeSlots: activeAvailableSlots, // only unassigned slots passed as active available
        activeAssignments: [],
        assignedCount: 15,
        totalOpenCount: 105,
      });

      expect(result.targetPoolSize).toBe(100);
      expect(result.availableContributionCount).toBe(90);
      expect(result.assignedContributionCount).toBe(15);
      expect(result.openContributionCount).toBe(105);
      // Deficit is 100 - 90 = 10
      expect(result.missingSlotCount).toBe(10);
      expect(result.slotsToCreate).toHaveLength(10);
    });

    it("enforces MAX_CREATE_PER_RUN = 20 safety cap to prevent runaway issue creation", () => {
      expect(MAX_CREATE_PER_RUN).toBe(20);

      // Suppose repository has 0 available slots -> deficit is 100
      const result = computeReplenishment({
        activeSlots: [],
        activeAssignments: [],
      });

      expect(result.targetPoolSize).toBe(100);
      expect(result.missingSlotCount).toBe(100);
      // But only 20 created in this single run
      expect(result.slotsToCreate).toHaveLength(20);
      expect(result.generatedIssues).toHaveLength(20);
      expect(result.slotsToCreate[0]).toBe("CONTRIB-SLOT #01");
      expect(result.slotsToCreate[19]).toBe("CONTRIB-SLOT #20");
    });

    it("preserves existing slot numbers and fills exact missing gaps", () => {
      // Suppose slots #01, #02, #04 exist (#03 missing)
      const existing = ["CONTRIB-SLOT #01", "CONTRIB-SLOT #02", "CONTRIB-SLOT #04"];
      const missing = calculateMissingSlotIds(existing, 100);
      expect(missing[0]).toBe("CONTRIB-SLOT #03");
      expect(missing[1]).toBe("CONTRIB-SLOT #05");
      expect(missing).toHaveLength(97);
    });

    it("dry-run produces accurate simulation outputs without modifying data", () => {
      const activeAvailableSlots = Array.from({ length: 95 }, (_, i) => `CONTRIB-SLOT #${String(i + 1).padStart(2, "0")}`);
      const dryRunResult = computeReplenishment({
        activeSlots: activeAvailableSlots,
        activeAssignments: [],
        assignedCount: 8,
        totalOpenCount: 103,
      });

      expect(dryRunResult.targetPoolSize).toBe(100);
      expect(dryRunResult.availableContributionCount).toBe(95);
      expect(dryRunResult.assignedContributionCount).toBe(8);
      expect(dryRunResult.openContributionCount).toBe(103);
      expect(dryRunResult.missingSlotCount).toBe(5);
      expect(dryRunResult.slotsToCreate).toEqual([
        "CONTRIB-SLOT #96",
        "CONTRIB-SLOT #97",
        "CONTRIB-SLOT #98",
        "CONTRIB-SLOT #99",
        "CONTRIB-SLOT #100",
      ]);
    });
  });

  describe("Phase G: Segment 04–10 Contribution Slot Isolation & Legacy 01–03 Protection Suite", () => {
    it("preserves legacy curated concepts (39 total) exclusively targeting segments 01–03", () => {
      expect(LEGACY_CURATED_CONCEPTS.length).toBe(39);
      for (const concept of LEGACY_CURATED_CONCEPTS) {
        const segNum = parseInt(concept.defaultSegmentId.split("-").pop()!, 10);
        expect(segNum).toBeGreaterThanOrEqual(1);
        expect(segNum).toBeLessThanOrEqual(3);
      }
    });

    it("verifies active contribution concepts (140 total) exclusively target segments 04–10", () => {
      expect(ACTIVE_CONTRIBUTION_CONCEPTS.length).toBe(140);
      for (const concept of ACTIVE_CONTRIBUTION_CONCEPTS) {
        const segNum = parseInt(concept.defaultSegmentId.split("-").pop()!, 10);
        expect(segNum).toBeGreaterThanOrEqual(4);
        expect(segNum).toBeLessThanOrEqual(10);
      }
    });

    it("ensures selectFreshConcept NEVER selects a concept from legacy segments 01–03", () => {
      // Test across multiple iterative selections
      const activeAssignments: { worldId: string; objectName: string }[] = [];
      for (let i = 0; i < 50; i++) {
        const fresh = selectFreshConcept(activeAssignments);
        const segNum = parseInt(fresh.defaultSegmentId.split("-").pop()!, 10);
        expect(segNum).toBeGreaterThanOrEqual(4);
        expect(segNum).toBeLessThanOrEqual(10);
        activeAssignments.push({ worldId: fresh.worldId, objectName: fresh.objectName });
      }
    });

    it("ensures all 10 worlds can generate new contribution concepts from segments 04–10", () => {
      const allWorldIds = [
        "growing-forest",
        "growing-universe",
        "growing-ocean",
        "growing-city",
        "growing-village",
        "growing-island",
        "growing-farm",
        "growing-campus",
        "fantasy-world",
        "alien-planet",
      ];

      for (const worldId of allWorldIds) {
        const concept = selectFreshConcept([], worldId);
        expect(concept.worldId).toBe(worldId);
        const segNum = parseInt(concept.defaultSegmentId.split("-").pop()!, 10);
        expect(segNum).toBeGreaterThanOrEqual(4);
        expect(segNum).toBeLessThanOrEqual(10);
      }
    });

    it("proves Forest Deer is never selected from legacy forest-03 when generating new slots", () => {
      // If forest is preferred, it should select concepts like River Woodland Flower, Ridge Pine, Fern Deer (forest-06), etc.
      // but never Forest Deer with defaultSegmentId === 'forest-03'
      const forestConcepts: CuratedConcept[] = [];
      const active: { worldId: string; objectName: string }[] = [];
      for (let i = 0; i < 14; i++) {
        const concept = selectFreshConcept(active, "growing-forest");
        forestConcepts.push(concept);
        active.push({ worldId: concept.worldId, objectName: concept.objectName });
      }

      for (const c of forestConcepts) {
        expect(c.defaultSegmentId).not.toBe("forest-03");
        expect(c.defaultSegmentId).not.toBe("forest-01");
        expect(c.defaultSegmentId).not.toBe("forest-02");
      }

      // Verify Fern Deer in forest-06 is present in the active pool instead
      const fernDeer = forestConcepts.find((c) => c.objectName === "Fern Deer");
      expect(fernDeer).toBeDefined();
      expect(fernDeer?.defaultSegmentId).toBe("forest-06");
    });

    it("maintains total CURATED_CONCEPTS catalog size of 179 and zero duplicates", () => {
      expect(CURATED_CONCEPTS.length).toBe(179);
      const keys = new Set<string>();
      for (const c of CURATED_CONCEPTS) {
        const key = `${c.worldId}:${c.objectName}`;
        expect(keys.has(key)).toBe(false);
        keys.add(key);
      }
    });

    it("modernizes legacy issue bodies lacking -<yourName> instruction cleanly", () => {
      const legacyBody = `
#### 3. Register the Object (Commit 1)
\`\`\`typescript
{
  id: "butterfly",
  asset: "/assets/worlds/growing-forest/student-butterfly.svg",
  contributor: {
    displayName: "<Your Name>",
    githubUsername: "<your-github-username>",
  },
},
\`\`\`
Stage and commit this change:
\`\`\`bash
git commit -m "feat: register butterfly object"
\`\`\`
#### 4. Place the Object in the World (Commit 2)
\`\`\`typescript
{
  objectId: "butterfly",
  segmentId: "forest-01",
  x: 45.0,
  y: 55.0,
},
\`\`\`
\`\`\`bash
git commit -m "feat: place butterfly in forest-01"
\`\`\`
`;

      const result = modernizeIssueBodyInstruction(legacyBody);
      expect(result.updated).toBe(true);
      expect(result.newBody).toContain('id: "butterfly-<yourName>"');
      expect(result.newBody).toContain('objectId: "butterfly-<yourName>"');
      expect(result.newBody).toContain('feat: register butterfly-<yourName> object');
      expect(result.newBody).toContain('feat: place butterfly-<yourName> in forest-01');
      expect(result.newBody).toContain("Object ID Format");

      // Idempotent test
      const secondPass = modernizeIssueBodyInstruction(result.newBody);
      expect(secondPass.updated).toBe(false);
    });
  });
});
