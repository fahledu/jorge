// E2E shortcut (ADR 0010): imported only when the build mode is `e2e`, so the production
// build does not contain it (checked by scripts/check-dist.ts).
import { type AttemptEvent, isInvulnerable } from "../domain/attempt.ts";
import { type Cell, cellOf } from "../domain/geometry.ts";
import { type HudFields, hudFields } from "../domain/hud.ts";
import { runningPoints, type ScoreSummary } from "../domain/score.ts";
import type {
  EnemySnapshot,
  LevelScene,
  LevelStatus,
  PlayerSnapshot,
} from "./scenes/level-scene.ts";

/** Where things are in the level, in cells, so the tests do not fix columns. */
export interface LevelCells {
  start: Cell;
  flag: Cell;
  spikes: Cell[];
  items: (Cell & { id: number; type: string })[];
  enemies: (Cell & { id: number; type: string })[];
}

export interface JorgeTestHooks {
  state(): {
    status: LevelStatus | "title";
    attempt: number;
    hearts: number;
    coins: number;
    invulnerable: boolean;
    defeatedWalkers: number;
    defeatedFlyers: number;
    elapsedMs: number;
    points: number;
    events: readonly AttemptEvent[];
  };
  /** What the HUD shows now. */
  hud(): HudFields | null;
  /** The summary of the last completed attempt. */
  lastSummary(): ScoreSummary | null;
  player(): PlayerSnapshot | null;
  enemies(): EnemySnapshot[];
  freezeEnemies(frozen: boolean): void;
  level(): LevelCells | null;
  placePlayer(col: number, row: number): void;
  goToFlag(): void;
}

declare global {
  interface Window {
    __jorgeTest?: JorgeTestHooks;
  }
}

export function installTestHooks(levelScene: () => LevelScene | null): void {
  const playing = (): LevelScene | null => {
    const scene = levelScene();
    return scene && scene.status !== "loading" ? scene : null;
  };
  window.__jorgeTest = {
    state() {
      const scene = levelScene();
      if (!scene?.sys.settings.data) {
        return {
          status: "title",
          attempt: 0,
          hearts: 3,
          coins: 0,
          invulnerable: false,
          defeatedWalkers: 0,
          defeatedFlyers: 0,
          elapsedMs: 0,
          points: 0,
          events: [],
        };
      }
      const { hearts, coins, defeatedWalkers, defeatedFlyers, elapsedMs, events } =
        scene.attemptState;
      return {
        status: scene.status,
        attempt: scene.attempt,
        hearts,
        coins,
        invulnerable: isInvulnerable(scene.attemptState),
        defeatedWalkers,
        defeatedFlyers,
        elapsedMs,
        points: runningPoints(events),
        events,
      };
    },
    hud() {
      const scene = playing();
      return scene ? hudFields(scene.attemptState, scene.levelInfo.levelNumber) : null;
    },
    lastSummary: () => levelScene()?.lastSummary ?? null,
    player: () => playing()?.playerSnapshot() ?? null,
    enemies: () => playing()?.enemySnapshots() ?? [],
    freezeEnemies: (frozen) => levelScene()?.freezeEnemies(frozen),
    level() {
      const info = playing()?.levelInfo;
      if (!info) return null;
      return {
        start: cellOf(info.start),
        flag: cellOf(info.flag),
        spikes: info.spikes,
        items: info.items.map((item) => ({ id: item.id, type: item.type, ...cellOf(item) })),
        enemies: info.enemies.map((enemy) => ({
          id: enemy.id,
          type: enemy.type,
          ...cellOf(enemy),
        })),
      };
    },
    placePlayer: (col, row) => playing()?.placePlayer(col, row),
    goToFlag: () => playing()?.goToFlag(),
  };
}
