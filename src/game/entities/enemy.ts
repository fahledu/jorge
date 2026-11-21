import Phaser from "phaser";
import { type DefeatPose, type EnemyType, patrolAxis } from "../../domain/enemies.ts";
import type { Theme } from "../../domain/theme.ts";
import { ENEMY_FACES_RIGHT, ENEMY_FRAMES } from "../../domain/tiles.ts";
import { TILE_SIZE } from "../../domain/tmj.ts";
import { CHARACTERS } from "./player.ts";

const FRAME_SIZE = 24;
/** Animation speed, frames per second (plan 1e, decision 11). */
const ENEMY_FPS: Record<EnemyType, number> = { walker: 4, flyer: 8, spiky: 4, "flyer-v": 8 };

/**
 * A walker or a flyer: only a drawing, with no physics body. Where it is and whether it
 * touches the player is the domain's (plan 1e, decision 1).
 */
export class Enemy extends Phaser.GameObjects.Sprite {
  #baseY: number;
  readonly #vertical: boolean;

  /** `pos` is the patrol position on the axis of the type; the other coordinate is the row's. */
  constructor(scene: Phaser.Scene, theme: Theme, type: EnemyType, pos: number, row: number) {
    // A walker and a spiky stand on the bottom of their cell; flyers are centred in it.
    const grounded = type === "walker" || type === "spiky";
    const vertical = patrolAxis(type) === "y";
    const rowY = grounded ? (row + 1) * TILE_SIZE - FRAME_SIZE / 2 : (row + 0.5) * TILE_SIZE;
    const frames = ENEMY_FRAMES[theme][type];
    super(
      scene,
      vertical ? 0 : Math.round(pos),
      vertical ? Math.round(pos) : rowY,
      CHARACTERS,
      frames[0],
    );
    this.#baseY = vertical ? Math.round(pos) : rowY;
    this.#vertical = vertical;
    scene.add.existing(this);
    // The key has the theme: animations stay in the cache between levels.
    const key = `enemy-${theme}-${type}`;
    if (!scene.anims.exists(key)) {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(CHARACTERS, { frames: [...frames] }),
        frameRate: ENEMY_FPS[type],
        repeat: -1,
      });
    }
    this.play(key);
  }

  /**
   * Moves the drawing to `pos` on its axis, looking the way it goes; the vertical flyer
   * does not mirror (plan 1g2, decision 5), and `x` is its column.
   */
  place(pos: number, direction: -1 | 1, x = 0): void {
    if (this.#vertical) {
      this.#baseY = Math.round(pos);
      this.setPosition(Math.round(x), this.#baseY);
      return;
    }
    this.setX(Math.round(pos));
    this.setFlipX(direction > 0 === !ENEMY_FACES_RIGHT);
  }

  /** Defeated: upside down, still frame, at the pose of the effect. */
  showDefeat(pose: DefeatPose): void {
    if (!this.flipY) {
      this.anims.stop();
      this.setFlipY(true);
    }
    this.setY(this.#baseY + pose.dy).setAlpha(pose.alpha);
  }
}
