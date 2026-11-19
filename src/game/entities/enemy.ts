import Phaser from "phaser";
import type { DefeatPose, EnemyType } from "../../domain/enemies.ts";
import { ENEMY_FACES_RIGHT, ENEMY_FRAMES } from "../../domain/tiles.ts";
import { TILE_SIZE } from "../../domain/tmj.ts";
import { CHARACTERS } from "./player.ts";

const FRAME_SIZE = 24;
/** Animation speed, frames per second (plan 1e, decision 11). */
const ENEMY_FPS: Record<EnemyType, number> = { walker: 4, flyer: 8 };

/**
 * A walker or a flyer: only a drawing, with no physics body. Where it is and whether it
 * touches the player is the domain's (plan 1e, decision 1).
 */
export class Enemy extends Phaser.GameObjects.Sprite {
  readonly #baseY: number;

  constructor(scene: Phaser.Scene, type: EnemyType, x: number, row: number) {
    // A walker stands on the bottom of its cell; a flyer is centred in it.
    const y = type === "walker" ? (row + 1) * TILE_SIZE - FRAME_SIZE / 2 : (row + 0.5) * TILE_SIZE;
    super(scene, Math.round(x), y, CHARACTERS, ENEMY_FRAMES[type][0]);
    this.#baseY = y;
    scene.add.existing(this);
    const key = `enemy-${type}`;
    if (!scene.anims.exists(key)) {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(CHARACTERS, { frames: [...ENEMY_FRAMES[type]] }),
        frameRate: ENEMY_FPS[type],
        repeat: -1,
      });
    }
    this.play(key);
  }

  /** Moves the drawing to centre `x`, looking the way it goes. */
  place(x: number, direction: -1 | 1): void {
    this.setX(Math.round(x));
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
