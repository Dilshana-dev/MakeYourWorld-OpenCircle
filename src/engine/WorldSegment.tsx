import React from "react";
import type {
  WorldSegment as WorldSegmentDef,
  WorldObject as WorldObjectDef,
  ObjectPlacement,
} from "@/schemas";
import { WorldBackground } from "./WorldBackground";
import { WorldObject } from "./WorldObject";

export interface WorldSegmentProps {
  segment: WorldSegmentDef;
  objects: WorldObjectDef[];
  placements: ObjectPlacement[];
}

/**
 * WorldSegment renders a single background window and filters/renders only the objects
 * placed specifically within this segment (matching placement.segmentId === segment.id).
 */
export function WorldSegment({ segment, objects, placements }: WorldSegmentProps) {
  const objectsMap = new Map(objects.map((obj) => [obj.id, obj]));

  // Filter placements belonging specifically to this active segment
  const segmentPlacements = placements.filter(
    (placement) => placement.segmentId === segment.id
  );

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      data-testid={`world-segment-${segment.id}`}
      data-segment-id={segment.id}
    >
      {/* 1. Backdrop Layer */}
      <WorldBackground background={segment.background} />

      {/* 2. Placed Objects Layer for this segment */}
      <div className="relative h-full w-full z-10 pointer-events-none">
        {segmentPlacements.map((placement, idx) => {
          const objectDef = objectsMap.get(placement.objectId);
          if (!objectDef) return null;

          const placementKey = placement.id || `${placement.segmentId}-${placement.objectId}-${idx}`;

          return (
            <WorldObject
              key={placementKey}
              objectDef={objectDef}
              placement={placement}
              instanceId={placementKey}
            />
          );
        })}
      </div>
    </div>
  );
}
