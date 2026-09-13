import type { ObjectPlacement } from "@/schemas";

/**
 * [CONTRIBUTOR ZONE - Commit 2]
 * Single starting placement for Growing City in Segment 01 (Brownstone Street).
 */
export const cityPlacements: ObjectPlacement[] = [
  {
    objectId: "street-lamp",
    segmentId: "city-01",
    x: 24.0,
    y: 68.0,
    scale: 1.05,
    rotation: 1,
  },
  // Phase F: Starter placements for new segments 04–10
  {
    id: "city-04-street-lamp-1",
    objectId: "street-lamp",
    segmentId: "city-04",
    x: 20.0,
    y: 65.0,
    scale: 1.0,
    rotation: 0,
  },
  {
    id: "city-05-street-lamp-1",
    objectId: "street-lamp",
    segmentId: "city-05",
    x: 80.0,
    y: 68.0,
    scale: 1.1,
    rotation: -1,
  },
  {
    id: "city-06-street-lamp-1",
    objectId: "street-lamp",
    segmentId: "city-06",
    x: 35.0,
    y: 62.0,
    scale: 0.95,
    rotation: 2,
  },
  {
    id: "city-07-street-lamp-1",
    objectId: "street-lamp",
    segmentId: "city-07",
    x: 70.0,
    y: 66.0,
    scale: 1.05,
    rotation: 0,
  },
  {
    id: "city-08-street-lamp-1",
    objectId: "street-lamp",
    segmentId: "city-08",
    x: 25.0,
    y: 64.0,
    scale: 1.0,
    rotation: -2,
  },
  {
    id: "city-09-street-lamp-1",
    objectId: "street-lamp",
    segmentId: "city-09",
    x: 75.0,
    y: 70.0,
    scale: 1.15,
    rotation: 1,
  },
  {
    id: "city-10-street-lamp-1",
    objectId: "street-lamp",
    segmentId: "city-10",
    x: 50.0,
    y: 60.0,
    scale: 1.0,
    rotation: 0,
  },
  { 
    objectId: "paper-tram",
    segmentId: "city-03",
    x: 40.0,
    y: 56.0,
    scale: 1.0,
    rotation: 0,
  },
  {
    objectId: "paper-bicycle",
    segmentId: "city-02",
    x: 45.0,
    y: 55.0,
    scale: 1.0,
    rotation: 0,
  },
];
