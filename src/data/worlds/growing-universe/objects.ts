import type { WorldObject } from "@/schemas";

/**
 * [CONTRIBUTOR ZONE - Commit 1]
 * Single starting item for Growing Universe.
 */
export const universeObjects: WorldObject[] = [
  {
    id: "paper-planet",
    asset: "/assets/worlds/growing-universe/paper-planet.svg",
    contributor: {
      displayName: "Luna",
      githubUsername: "luna-stargazer",
    },
  },
  {
    id: "crescent-moon",
    asset: "/assets/worlds/growing-universe/crescent-moon.svg",
    contributor: {
      displayName: "Venuri Perera",
      githubUsername: "venuri-p",
    },
  }
];
