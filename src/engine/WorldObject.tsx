import React from "react";
import type { WorldObject as WorldObjectDef, ObjectPlacement } from "@/schemas";
import { calculatePositionStyle } from "./positioning/math";
import { ContributorLabel } from "./ContributorLabel";

export interface WorldObjectProps {
  objectDef: WorldObjectDef;
  placement: ObjectPlacement;
  instanceId?: string;
}

/**
 * WorldObject renders a single contributor object in the world.
 * Calculates responsive normalized CSS coordinates and positions the ContributorLabel automatically beneath it.
 * Uses physical paper drop shadows and subtle hover elevation.
 */
export function WorldObject({ objectDef, placement, instanceId }: WorldObjectProps) {
  const style = calculatePositionStyle(
    placement.x,
    placement.y,
    placement.scale,
    placement.rotation
  );

  const effectiveContributor = placement.contributor || objectDef.contributor;
  const placementTestId = placement.id
    ? `world-placement-${placement.id}`
    : `world-object-${objectDef.id}`;
  const effectiveInstanceId = placement.id || instanceId || `${placement.segmentId}-${objectDef.id}`;

  return (
    <div
      className="absolute flex flex-col items-center pointer-events-auto transition-transform duration-300 ease-out hover:z-[2000]"
      style={{
        left: style.left,
        top: style.top,
        transform: style.transform,
        zIndex: style.zIndex,
      }}
      data-testid={placementTestId}
      data-object-id={objectDef.id}
      data-placement-id={placement.id}
      data-instance-id={effectiveInstanceId}
      data-segment-id={placement.segmentId}
      title={`${objectDef.id} • Contributed by ${effectiveContributor.displayName}`}
    >
      <div className="relative flex items-center justify-center filter drop-shadow-[0_6px_6px_rgba(10,20,15,0.22)] transition-transform duration-200 hover:scale-105">
        <img
          src={objectDef.asset}
          alt={objectDef.id}
          className="h-20 w-20 max-w-[120px] max-h-[120px] object-contain select-none pointer-events-auto"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
            const fallback = target.parentElement?.querySelector(".fallback-placeholder");
            if (fallback) {
              (fallback as HTMLElement).style.display = "flex";
            }
          }}
        />
        <div
          className="fallback-placeholder hidden h-16 w-16 items-center justify-center rounded-lg border border-dashed border-foreground/30 bg-card/80 p-2 text-center text-xs font-mono font-medium text-foreground shadow-sm"
          title={objectDef.id}
        >
          📦
        </div>
      </div>
      <ContributorLabel contributor={effectiveContributor} />
    </div>
  );
}
