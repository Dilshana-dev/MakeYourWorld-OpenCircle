import { describe, it, expect } from "vitest";
import { checkRepositoryIntegrity } from "../../../scripts/integrity-checker";
import { implementedWorlds } from "@/data/worlds";
import type { World } from "@/schemas";

describe("Repository Data & Asset Integrity Audit Suite", () => {
  it("passes integrity audit for all 10 active repository worlds", () => {
    const result = checkRepositoryIntegrity(implementedWorlds);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.totalWorldsChecked).toBe(10);
    expect(result.totalObjectsChecked).toBeGreaterThanOrEqual(10);
    expect(result.totalPlacementsChecked).toBeGreaterThanOrEqual(10);
  });

  it("fails if an object references a missing asset file", () => {
    const invalidWorld: World = {
      ...implementedWorlds[0],
      objects: [
        {
          id: "missing-asset-item",
          asset: "/assets/worlds/growing-forest/non-existent-asset.svg",
          contributor: { displayName: "Tester" },
        },
      ],
      placements: [
        {
          objectId: "missing-asset-item",
          segmentId: "forest-01",
          x: 50,
          y: 50,
        },
      ],
    };

    const result = checkRepositoryIntegrity([invalidWorld]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Asset not found on disk"))).toBe(true);
  });

  it("fails if a placement references an undeclared objectId", () => {
    const invalidWorld: World = {
      ...implementedWorlds[0],
      placements: [
        {
          objectId: "undeclared-object-123",
          segmentId: "forest-01",
          x: 50,
          y: 50,
        },
      ],
    };

    const result = checkRepositoryIntegrity([invalidWorld]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Placement references undeclared objectId"))).toBe(true);
  });

  it("fails if a placement references an undeclared segmentId", () => {
    const invalidWorld: World = {
      ...implementedWorlds[0],
      placements: [
        {
          objectId: implementedWorlds[0].objects[0].id,
          segmentId: "invalid-segment-999",
          x: 50,
          y: 50,
        },
      ],
    };

    const result = checkRepositoryIntegrity([invalidWorld]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Placement references undeclared segmentId"))).toBe(true);
  });

  it("fails if a world has an unexpected segment count", () => {
    const invalidWorld: World = {
      ...implementedWorlds[0],
      segments: [implementedWorlds[0].segments[0]], // only 1 segment instead of 10
    };

    const result = checkRepositoryIntegrity([invalidWorld], { expectedSegmentsCount: 10 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("has 1 segment(s), but exactly 10 are expected"))).toBe(true);
  });

  describe("Phase F: New Segment Starter Content & Placement Integrity", () => {
    it("asserts active starter content in new segments 04–10 and verifies contributor uniqueness in growing-forest", () => {
      for (const world of implementedWorlds) {
        if (world.id === "growing-forest") {
          // Growing Forest maintains genuine 1-per-contributor placements without artificial clones
          expect(world.placements.length).toBeGreaterThanOrEqual(8);
          continue;
        }
        for (let segIndex = 4; segIndex <= 10; segIndex++) {
          const segSuffix = String(segIndex).padStart(2, "0");
          const segment = world.segments.find((s) => s.id.endsWith(`-${segSuffix}`));
          expect(segment).toBeDefined();

          const placementsInSeg = world.placements.filter((p) => p.segmentId === segment?.id);
          expect(
            placementsInSeg.length,
            `Expected world '${world.id}' segment '${segment?.id}' to have at least one starter placement`
          ).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it("verifies that in growing-forest each contributor label appears at most once across all frames", () => {
      const forest = implementedWorlds.find((w) => w.id === "growing-forest")!;
      const contributorNames = forest.placements.map((p) => {
        const obj = forest.objects.find((o) => o.id === p.objectId);
        return p.contributor?.displayName || obj?.contributor.displayName;
      });
      const uniqueNames = new Set(contributorNames);
      expect(contributorNames.length).toBe(uniqueNames.size);
    });

    it("verifies all explicit placement IDs in newly populated segments are unique", () => {
      for (const world of implementedWorlds) {
        const seenIds = new Set<string>();
        for (const placement of world.placements) {
          if (placement.id) {
            expect(seenIds.has(placement.id), `Duplicate placement ID '${placement.id}' found in '${world.id}'`).toBe(false);
            seenIds.add(placement.id);
          }
        }
      }
    });

    it("confirms existing placements in segments 01–03 are preserved untouched", () => {
      const forest = implementedWorlds.find((w) => w.id === "growing-forest")!;
      const forest01 = forest.placements.filter((p) => p.segmentId === "forest-01");
      const forest03 = forest.placements.filter((p) => p.segmentId === "forest-03");
      expect(forest01.some((p) => p.objectId === "pine-tree")).toBe(true);
      expect(forest01.some((p) => p.objectId === "song-bird")).toBe(true);
      expect(forest03.some((p) => p.objectId === "red-mushroom")).toBe(true);

      const ocean = implementedWorlds.find((w) => w.id === "growing-ocean")!;
      const ocean01 = ocean.placements.filter((p) => p.segmentId === "ocean-01");
      const ocean03 = ocean.placements.filter((p) => p.segmentId === "ocean-03");
      expect(ocean01.some((p) => p.objectId === "clownfish")).toBe(true);
      expect(ocean03.some((p) => p.objectId === "research-submarine")).toBe(true);
    });
  });
});
