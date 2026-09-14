import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorldSchema, ObjectPlacementSchema } from "@/schemas";
import { WorldSegment } from "@/engine/WorldSegment";
import { checkRepositoryIntegrity } from "../../../scripts/integrity-checker";
import { growingForestWorld } from "@/data/worlds/growing-forest";
import type { World, WorldObject, ObjectPlacement } from "@/schemas";

describe("Phase B: Multiple Object Instances in a Single Segment", () => {
  const baseObject: WorldObject = {
    id: "paper-satellite",
    asset: "/assets/worlds/growing-universe/space-probe.svg",
    contributor: {
      displayName: "Original Author",
      githubUsername: "orig-author",
    },
  };

  const segmentDef = {
    id: "universe-01",
    order: 0,
    name: "Starlit Orbit",
    background: {
      cssGradient: "linear-gradient(to bottom, #050B14, #0A1628)",
      altText: "Deep space diorama",
    },
  };

  describe("1. Schema & Validation Support", () => {
    it("validates legacy placement without an explicit placement id or contributor", () => {
      const placement = {
        objectId: "paper-satellite",
        segmentId: "universe-01",
        x: 20,
        y: 30,
      };

      const parsed = ObjectPlacementSchema.safeParse(placement);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.id).toBeUndefined();
        expect(parsed.data.contributor).toBeUndefined();
      }
    });

    it("validates new placement with explicit placement id and placement-level contributor", () => {
      const placement = {
        id: "universe-satellite-01",
        objectId: "paper-satellite",
        segmentId: "universe-01",
        x: 25,
        y: 35,
        contributor: {
          displayName: "Satellite Contributor 1",
          githubUsername: "student-dev-1",
        },
      };

      const parsed = ObjectPlacementSchema.safeParse(placement);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.id).toBe("universe-satellite-01");
        expect(parsed.data.contributor?.githubUsername).toBe("student-dev-1");
      }
    });

    it("allows 1, 2, and 3 instances of the same objectId within the same segment in WorldSchema", () => {
      const threePlacements: ObjectPlacement[] = [
        {
          id: "sat-instance-01",
          objectId: "paper-satellite",
          segmentId: "universe-01",
          x: 20,
          y: 40,
          contributor: { displayName: "Alice", githubUsername: "alice" },
        },
        {
          id: "sat-instance-02",
          objectId: "paper-satellite",
          segmentId: "universe-01",
          x: 50,
          y: 40,
          contributor: { displayName: "Bob", githubUsername: "bob" },
        },
        {
          id: "sat-instance-03",
          objectId: "paper-satellite",
          segmentId: "universe-01",
          x: 80,
          y: 40,
          contributor: { displayName: "Charlie", githubUsername: "charlie" },
        },
      ];

      const testWorld: World = {
        id: "test-universe",
        name: "Test Universe",
        description: "Test world with 3 satellite instances",
        theme: { primaryColor: "#000" },
        segments: [segmentDef],
        objects: [baseObject],
        placements: threePlacements,
      };

      const result = WorldSchema.safeParse(testWorld);
      expect(result.success).toBe(true);
    });

    it("rejects duplicate placement IDs in WorldSchema", () => {
      const duplicatePlacements: ObjectPlacement[] = [
        {
          id: "sat-duplicate-id",
          objectId: "paper-satellite",
          segmentId: "universe-01",
          x: 20,
          y: 40,
        },
        {
          id: "sat-duplicate-id",
          objectId: "paper-satellite",
          segmentId: "universe-01",
          x: 50,
          y: 40,
        },
      ];

      const testWorld: World = {
        id: "test-universe",
        name: "Test Universe",
        description: "Test duplicate placement ids",
        theme: { primaryColor: "#000" },
        segments: [segmentDef],
        objects: [baseObject],
        placements: duplicatePlacements,
      };

      const result = WorldSchema.safeParse(testWorld);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Duplicate placement ID 'sat-duplicate-id'");
      }
    });

    it("rejects duplicate placement IDs in checkRepositoryIntegrity", () => {
      const duplicatePlacements: ObjectPlacement[] = [
        {
          id: "dup-placement-01",
          objectId: growingForestWorld.objects[0].id,
          segmentId: "forest-01",
          x: 20,
          y: 30,
        },
        {
          id: "dup-placement-01",
          objectId: growingForestWorld.objects[0].id,
          segmentId: "forest-01",
          x: 40,
          y: 50,
        },
      ];

      const worldWithDuplicate: World = {
        ...growingForestWorld,
        placements: duplicatePlacements,
      };

      const audit = checkRepositoryIntegrity([worldWithDuplicate]);
      expect(audit.valid).toBe(false);
      expect(audit.errors.some((e) => e.includes("Duplicate placement ID 'dup-placement-01'"))).toBe(true);
    });
  });

  describe("2. Rendering & DOM Representation", () => {
    it("renders 1 instance of the object in WorldSegment with correct attribution", () => {
      const placements: ObjectPlacement[] = [
        {
          id: "single-instance-01",
          objectId: "paper-satellite",
          segmentId: "universe-01",
          x: 30,
          y: 60,
          contributor: { displayName: "Student One", githubUsername: "student-one" },
        },
      ];

      const html = renderToStaticMarkup(
        <WorldSegment
          segment={segmentDef}
          objects={[baseObject]}
          placements={placements}
        />
      );

      expect(html).toContain('data-testid="world-placement-single-instance-01"');
      expect(html).toContain('data-placement-id="single-instance-01"');
      expect(html).toContain('data-object-id="paper-satellite"');
      expect(html).toContain("Student One");
    });

    it("renders 2 and 3 instances of the same object in the same segment simultaneously", () => {
      const threePlacements: ObjectPlacement[] = [
        {
          id: "satellite-instance-1",
          objectId: "paper-satellite",
          segmentId: "universe-01",
          x: 15,
          y: 50,
          contributor: { displayName: "Dev Alpha", githubUsername: "dev-alpha" },
        },
        {
          id: "satellite-instance-2",
          objectId: "paper-satellite",
          segmentId: "universe-01",
          x: 50,
          y: 50,
          contributor: { displayName: "Dev Beta", githubUsername: "dev-beta" },
        },
        {
          id: "satellite-instance-3",
          objectId: "paper-satellite",
          segmentId: "universe-01",
          x: 85,
          y: 50,
          contributor: { displayName: "Dev Gamma", githubUsername: "dev-gamma" },
        },
      ];

      const html = renderToStaticMarkup(
        <WorldSegment
          segment={segmentDef}
          objects={[baseObject]}
          placements={threePlacements}
        />
      );

      // Verify all 3 instances exist in the rendered markup simultaneously
      expect(html).toContain('data-testid="world-placement-satellite-instance-1"');
      expect(html).toContain('data-testid="world-placement-satellite-instance-2"');
      expect(html).toContain('data-testid="world-placement-satellite-instance-3"');

      // Verify independent contributor badges
      expect(html).toContain("Dev Alpha");
      expect(html).toContain("Dev Beta");
      expect(html).toContain("Dev Gamma");
    });

    it("falls back to object-level contributor when placement does not define one (backward compatibility)", () => {
      const legacyPlacement: ObjectPlacement = {
        objectId: "paper-satellite",
        segmentId: "universe-01",
        x: 40,
        y: 60,
      };

      const html = renderToStaticMarkup(
        <WorldSegment
          segment={segmentDef}
          objects={[baseObject]}
          placements={[legacyPlacement]}
        />
      );

      expect(html).toContain('data-testid="world-object-paper-satellite"');
      expect(html).not.toContain("data-placement-id=");
      // Displays baseObject's contributor
      expect(html).toContain("Original Author");
    });

    it("renders both Prateek's and Sewmini's mushrooms in growing-forest segment-03 simultaneously with distinct labels and unique instance IDs", () => {
      const forest03Segment = growingForestWorld.segments.find((s) => s.id === "forest-03")!;
      expect(forest03Segment).toBeDefined();

      const html = renderToStaticMarkup(
        <WorldSegment
          segment={forest03Segment}
          objects={growingForestWorld.objects}
          placements={growingForestWorld.placements}
        />
      );

      // Verify both contributor labels render
      expect(html).toContain("Prateek Gupta");
      expect(html).toContain("hello...i&#x27;m..🌝");

      // Verify both object IDs are present in markup
      expect(html).toContain('data-object-id="red-mushroom"');
      expect(html).toContain('data-object-id="red-mushroom-sewmini"');

      // Verify unique instance IDs
      expect(html).toContain('data-instance-id="forest-03-red-mushroom-sewmini"');
      expect(html).toContain('data-instance-id="forest-03-red-mushroom-');
    });
  });
});

