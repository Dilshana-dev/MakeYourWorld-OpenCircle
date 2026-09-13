import type { WorldObject } from "@/schemas";

/**
 * [CONTRIBUTOR ZONE - Commit 1]
 * Single starting item for Growing City.
 */
export const cityObjects: WorldObject[] = [
  {
    id: "street-lamp",
    asset: "/assets/worlds/growing-city/street-lamp.svg",
    contributor: {
      displayName: "Marcus",
      githubUsername: "marcus-urban",
    },
  },
  {
    id: "paper-tram",
    asset: "/assets/worlds/growing-city/paper-tram.svg",
    contributor: {
      displayName: "sajannethsara",
      githubUsername: "nethsaradws",
    },
  },
  {
    id: "paper-bicycle",
    asset: "/assets/worlds/growing-city/paper-bicycle.svg",
    contributor: {
      displayName: "shashinibhagya",
      githubUsername: "Shashini543",
    },
  },
];
