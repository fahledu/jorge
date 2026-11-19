// E2E shortcut (ADR 0010): imported only when the build mode is `e2e`, so the production
// build does not contain it (checked by scripts/check-dist.ts).
import type { LevelScene, LevelStatus, PlayerSnapshot } from "./scenes/level-scene.ts";

export interface JorgeTestHooks {
  state(): { status: LevelStatus | "title"; attempt: number };
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
      if (!scene?.sys.settings.data) return { status: "title", attempt: 0 };
      return { status: scene.status, attempt: scene.attempt };
    },
    player: () => playing()?.playerSnapshot() ?? null,
    placePlayer: (col, row) => playing()?.placePlayer(col, row),
    goToFlag: () => playing()?.goToFlag(),
  };
}
