import { type LevelInfo, readLevelInfo } from "../domain/level.ts";

// One lazy chunk per level, with a hash in its name (ADR 0013): the title page downloads none.
const files = import.meta.glob<{ default: unknown }>("/levels/generated/*.json");

export interface LevelData {
  info: LevelInfo;
  /** The generated Tiled JSON, as Phaser's tilemap cache expects it. */
  tiled: unknown;
}

export async function loadLevel(levelNumber: number): Promise<LevelData> {
  const name = `/levels/generated/${String(levelNumber).padStart(3, "0")}.json`;
  const load = files[name];
  if (!load) throw new Error(`level ${levelNumber} does not exist`);
  const tiled = (await load()).default;
  const info = readLevelInfo(tiled);
  if (info.levelNumber !== levelNumber) {
    throw new Error(`level file ${name} says it is level ${info.levelNumber}`);
  }
  return { info, tiled };
}
