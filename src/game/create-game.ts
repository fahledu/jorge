import Phaser from "phaser";
import { computeScale, GAME_HEIGHT, GAME_WIDTH } from "../domain/scale";
import { EmptyScene } from "./scenes/empty-scene";

export interface GameHandle {
  /** Starts the placeholder scene and shows the canvas. */
  start(): void;
}

/**
 * Creates the Phaser game inside `parent` (which fills the view). The canvas is sized
 * by `computeScale` on every resize (ADR 0009), not by Phaser's FIT mode, which is
 * always fractional.
 */
export function createGame(parent: HTMLElement, label: string): GameHandle {
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

  let started = false;
  return {
    start() {
      if (started) return;
      started = true;
      parent.hidden = false;
      game.scene.add("empty", EmptyScene, true);
      fit();
    },
  };
}
