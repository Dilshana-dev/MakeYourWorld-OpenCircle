import type { ObjectPlacement } from "@/schemas";

/**
 * [CONTRIBUTOR ZONE - Commit 2]
 * Single starting placement for Growing Ocean in Segment 01 (Shallow Reef).
 */
export const oceanPlacements: ObjectPlacement[] = [
  {
    objectId: "clownfish",
    segmentId: "ocean-01",
    x: 32.0,
    y: 28.0,
    scale: 0.9,
    rotation: 4,
  },  
  {
    objectId: "research-submarine",
    segmentId: "ocean-03",
    x: 45.0,
    y: 55.0,
    scale: 1.0,
    rotation: 0,
  },
  {
    objectId: "research-submarine-bimsara",
    segmentId: "ocean-03",
    x: 75.0,
    y: 65.0,
    scale: 1.0,
    rotation: 0,
  },
  // Phase F: Starter placements for new segments 04–10
  {
    id: "ocean-04-clownfish-1",
    objectId: "clownfish",
    segmentId: "ocean-04",
    x: 28.0,
    y: 35.0,
    scale: 0.85,
    rotation: -3,
  },
  {
    id: "ocean-05-research-submarine-1",
    objectId: "research-submarine",
    segmentId: "ocean-05",
    x: 60.0,
    y: 52.0,
    scale: 1.05,
    rotation: 2,
  },
  {
    id: "ocean-06-clownfish-1",
    objectId: "clownfish",
    segmentId: "ocean-06",
    x: 40.0,
    y: 45.0,
    scale: 0.9,
    rotation: 5,
  },
  {
    id: "ocean-07-research-submarine-1",
    objectId: "research-submarine",
    segmentId: "ocean-07",
    x: 72.0,
    y: 60.0,
    scale: 1.1,
    rotation: -4,
  },
  {
    id: "ocean-08-clownfish-1",
    objectId: "clownfish",
    segmentId: "ocean-08",
    x: 35.0,
    y: 30.0,
    scale: 0.95,
    rotation: -2,
  },
  {
    id: "ocean-09-research-submarine-1",
    objectId: "research-submarine",
    segmentId: "ocean-09",
    x: 55.0,
    y: 48.0,
    scale: 1.0,
    rotation: 1,
  },
  {
    id: "ocean-10-clownfish-1",
    objectId: "clownfish",
    segmentId: "ocean-10",
    x: 65.0,
    y: 42.0,
    scale: 0.85,
    rotation: 6,
  },
];
