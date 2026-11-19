import Phaser from "phaser";
import { CommandState } from "../domain/commands.ts";
import { GRAVITY, PHYSICS_FPS } from "../domain/physics.ts";
import { computeScale, GAME_HEIGHT, GAME_WIDTH } from "../domain/scale.ts";
import type { EventBus } from "./events.ts";
import { attachKeyboard } from "./input/keyboard.ts";
import { loadLevel } from "./levels.ts";
import { LevelScene, type LevelSceneData } from "./scenes/level-scene.ts";

export interface GameHandle {
  /** Loads level 1 (on demand, ADR 0005), starts it and shows the canvas. */
  start(): void;
}

/**
 * Creates the Phaser game inside `parent` (which fills the view). The canvas is sized
 * by `computeScale` on every resize (ADR 0009), not by Phaser's FIT mode, which is
 * always fractional.
 */
export function createGame(
  parent: HTMLElement,
  bus: EventBus,
  label: string,
  levelLabel: (levelNumber: number) => string,
): GameHandle {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    transparent: true, // the sky color comes from a token in CSS (ADR 0009)
    pixelArt: true,
    roundPixels: true,
    banner: false,
    scale: { mode: Phaser.Scale.NONE },
    // Fixed step: the domain's jump model steps the same way (domain/physics.ts).
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: GRAVITY }, fps: PHYSICS_FPS, fixedStep: true },
    },
  });

  const fit = (): void => {
    const canvas = game.canvas;
    if (!canvas) return;
    const { width, height, offsetX, offsetY } = computeScale(
      parent.clientWidth,
      parent.clientHeight,
    );
    // CSSOM writes are allowed by the CSP; only inline style in markup is not.
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.left = `${offsetX}px`;
    canvas.style.top = `${offsetY}px`;
    // Recomputes the canvas bounds so pointer input maps to game pixels.
    game.scale.refresh();
  };

  game.events.once(Phaser.Core.Events.READY, () => {
    game.canvas.setAttribute("role", "img");
    game.canvas.setAttribute("aria-label", label);
    fit();
  });
  new ResizeObserver(fit).observe(parent);

  const commands = new CommandState();
  const keyboard = attachKeyboard(commands);
  const controls = {
    commands,
    setEnabled: (enabled: boolean) => (enabled ? keyboard.enable() : keyboard.disable()),
  };

  const levelScene = (): LevelScene | null => {
    const scene = game.scene.getScene("level");
    return scene instanceof LevelScene ? scene : null;
  };
  // Focus lost: the browser sends no keyup for keys still held, so pausing also lets go.
  const pauseOnFocusLoss = (): void => levelScene()?.pauseLevel();
  window.addEventListener("blur", pauseOnFocusLoss);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") pauseOnFocusLoss();
  });

  if (import.meta.env.DEV) {
    void import("./debug/fps-meter.ts").then(({ mountFpsMeter }) =>
      mountFpsMeter(parent, () => game.loop.actualFps),
    );
  }
  if (import.meta.env.MODE === "e2e") {
    void import("./test-hooks.ts").then(({ installTestHooks }) => installTestHooks(levelScene));
  }

  let started = false;
  return {
    start() {
      if (started) return;
      started = true;
      loadLevel(1).then(
        (level) => {
          parent.hidden = false;
          game.canvas.setAttribute("aria-label", levelLabel(level.info.levelNumber));
          const data: LevelSceneData = { level, bus, controls, attempt: 1 };
          game.scene.add("level", LevelScene, true, data);
          fit();
        },
        (error: unknown) => {
          // No error screen until item 1j: the failure goes to the console (plan 1b).
          // biome-ignore lint/suspicious/noConsole: the only report of a failed load in 1b
          console.error("could not load level 1", error);
        },
      );
    },
  };
}
