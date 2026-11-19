// E2E shortcut (ADR 0010): imported only when the build mode is `e2e`, so the production
// build does not contain it (checked by scripts/check-dist.ts).
import { isInvulnerable } from "../domain/attempt.ts";
import type { LevelScene, LevelStatus, PlayerSnapshot } from "./scenes/level-scene.ts";

export interface JorgeTestHooks {
  state(): {
    status: LevelStatus | "title";
    attempt: number;
    hearts: number;
    coins: number;
    invulnerable: boolean;
  };
  player(): PlayerSnapshot | null;
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
        return { status: "title", attempt: 0, hearts: 3, coins: 0, invulnerable: false };
      }
      const { hearts, coins } = scene.attemptState;
      return {
        status: scene.status,
        attempt: scene.attempt,
        hearts,
        coins,
        invulnerable: isInvulnerable(scene.attemptState),
      };
    },
    player: () => playing()?.playerSnapshot() ?? null,
    placePlayer: (col, row) => playing()?.placePlayer(col, row),
    goToFlag: () => playing()?.goToFlag(),
  };
}
