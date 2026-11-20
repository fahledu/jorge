// Chunk libraries for the generator tests: maps built in memory, already "parsed".
import type { LibraryChunk } from "../generator.ts";
import { MAP_HEIGHT, type Spawn, type SpawnType, TILE_SIZE } from "../tmj.ts";

export interface ChunkSpec {
  difficulty?: number;
  entryRow?: number;
  exitRow?: number;
  tags?: string[];
  width?: number;
  /** Spawns by type and column, standing on the ground of that half. */
  spawns?: { type: SpawnType; col: number; minTier?: number }[];
}

/** Flat ground at `entryRow` on the left half and `exitRow` on the right half. */
export function makeChunk(name: string, spec: ChunkSpec = {}): LibraryChunk {
  const { difficulty = 1, entryRow = 12, exitRow = 12, tags = [], width = 16 } = spec;
  const groundAt = (col: number): number => (col < width / 2 ? entryRow : exitRow);
  const terrain: number[] = [];
  for (let row = 0; row < MAP_HEIGHT; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const ground = groundAt(col);
      terrain.push(row === ground ? 23 : row > ground ? 123 : 0);
    }
  }
  const types = [...(spec.spawns ?? [])];
  if (tags.includes("start")) types.unshift({ type: "start", col: 1 });
  if (tags.includes("finish")) types.push({ type: "flag", col: width - 2 });
  const spawns: Spawn[] = types.map((s, index) => {
    const row = groundAt(s.col) - (s.type === "flyer" ? 3 : 1);
    const spawn: Spawn = {
      id: index + 1,
      type: s.type,
      x: s.col * TILE_SIZE + 9,
      y: row * TILE_SIZE + 9,
      col: s.col,
      row,
    };
    if (s.minTier !== undefined) spawn.minTier = s.minTier;
    return spawn;
  });
  return {
    name,
    map: {
      kind: "chunk",
      width,
      height: MAP_HEIGHT,
      terrain,
      decor: terrain.map(() => 0),
      spawns,
      chunk: { difficulty, entryRow, exitRow, tags },
    },
  };
}

/** Start and finish, plus two middle chunks for every difficulty from 1 to 10. */
export function fullLibrary(): LibraryChunk[] {
  const library = [
    makeChunk("start", { tags: ["start"] }),
    makeChunk("finish", { tags: ["finish"] }),
  ];
  for (let d = 1; d <= 10; d += 1) {
    library.push(makeChunk(`m${d}a`, { difficulty: d }), makeChunk(`m${d}b`, { difficulty: d }));
  }
  return library;
}
