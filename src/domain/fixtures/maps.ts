// Small .tmj fixtures for the tests of tmj.ts and level.ts (ADR 0012 subset).
import type { TilesetInfo } from "../tsx.ts";

export const TILESET: TilesetInfo = {
  name: "tileset-tiles",
  tilewidth: 18,
  tileheight: 18,
  tilecount: 180,
  columns: 20,
  margin: 0,
  spacing: 0,
  image: "../Tilemap/tilemap_packed.png",
  imagewidth: 360,
  imageheight: 162,
};

export interface FixtureSpawn {
  type: string;
  x: number;
  y: number;
  properties?: { name: string; type: string; value: unknown }[];
}

/** A valid map: ground on row 12, start on the left and flag on the right. */
export function makeMap(
  width: number,
  options: { spawns?: FixtureSpawn[]; properties?: unknown[] } = {},
): Record<string, unknown> {
  const terrain = Array.from({ length: width * 15 }, (_, i) =>
    Math.floor(i / width) >= 12 ? 23 : 0,
  );
  const decor = Array.from({ length: width * 15 }, () => 0);
  const spawns = options.spawns ?? [
    { type: "start", x: 27, y: 207 },
    { type: "flag", x: (width - 2) * 18 + 9, y: 207 },
  ];
  const objects = spawns.map((spawn, index) => ({
    height: 0,
    id: index + 1,
    name: "",
    point: true,
    ...(spawn.properties ? { properties: spawn.properties } : {}),
    rotation: 0,
    type: spawn.type,
    visible: true,
    width: 0,
    x: spawn.x,
    y: spawn.y,
  }));
  const layer = (id: number, name: string, data: number[]) => ({
    data,
    height: 15,
    id,
    name,
    opacity: 1,
    type: "tilelayer",
    visible: true,
    width,
    x: 0,
    y: 0,
  });
  return {
    compressionlevel: -1,
    height: 15,
    infinite: false,
    layers: [
      layer(1, "terrain", terrain),
      layer(2, "decor", decor),
      {
        draworder: "topdown",
        id: 3,
        name: "spawns",
        objects,
        opacity: 1,
        type: "objectgroup",
        visible: true,
        x: 0,
        y: 0,
      },
    ],
    nextlayerid: 4,
    nextobjectid: objects.length + 1,
    orientation: "orthogonal",
    ...(options.properties ? { properties: options.properties } : {}),
    renderorder: "right-down",
    tiledversion: "1.10.2",
    tileheight: 18,
    tilesets: [{ firstgid: 1, source: "../../assets/kenney/Tiled/tileset-tiles.tsx" }],
    tilewidth: 18,
    type: "map",
    version: "1.10",
    width,
  };
}

export const chunkProps = (difficulty = 1, extra: unknown[] = []): unknown[] => [
  { name: "difficulty", type: "int", value: difficulty },
  { name: "entryRow", type: "int", value: 12 },
  { name: "exitRow", type: "int", value: 12 },
  ...extra,
];
