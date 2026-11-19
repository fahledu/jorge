import Phaser from "phaser";
import { PLAYER_BODY } from "../../domain/physics.ts";
import { PLAYER_FACES_RIGHT, PLAYER_FRAMES } from "../../domain/tiles.ts";

export const CHARACTERS = "characters";
const WALK = "player-walk";
/** Walk animation speed, frames per second (plan 1c). */
const WALK_FPS = 8;

export type PlayerBody = Phaser.Physics.Arcade.Body;

/** The player: a 24×24 frame with a smaller Arcade body flush with its feet. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: PlayerBody;

  constructor(scene: Phaser.Scene, feet: { x: number; y: number }) {
    super(scene, feet.x, feet.y - PLAYER_BODY.frameSize / 2, CHARACTERS, PLAYER_FRAMES.idle);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(PLAYER_BODY.width, PLAYER_BODY.height);
    this.body.setOffset(
      (PLAYER_BODY.frameSize - PLAYER_BODY.width) / 2,
      PLAYER_BODY.frameSize - PLAYER_BODY.height,
    );
    this.setCollideWorldBounds(true);
    // Starts looking right, the way the level goes.
    this.setFlipX(!PLAYER_FACES_RIGHT);
    if (!scene.anims.exists(WALK)) {
      scene.anims.create({
        key: WALK,
        frames: scene.anims.generateFrameNumbers(CHARACTERS, {
          frames: [PLAYER_FRAMES.idle, PLAYER_FRAMES.walk],
        }),
        frameRate: WALK_FPS,
        repeat: -1,
      });
    }
  }

  /** Moves the feet to `feet`, standing still. */
  placeFeet(feet: { x: number; y: number }): void {
    this.body.reset(feet.x, feet.y - PLAYER_BODY.frameSize / 2);
  }

  /** Where the player looks: 1 right, −1 left. */
  get facing(): -1 | 1 {
    return this.flipX === PLAYER_FACES_RIGHT ? -1 : 1;
  }

  /** Still pose for the death effect: idle frame, no animation, fully opaque. */
  freeze(): void {
    this.anims.stop();
    this.setFrame(PLAYER_FRAMES.idle);
    this.setAlpha(1);
  }

  /** Picks the frame from the motion: idle, walking (2 frames) or in the air. */
  show(onGround: boolean): void {
    const vx = this.body.velocity.x;
    if (vx !== 0) this.setFlipX(vx < 0 === PLAYER_FACES_RIGHT);
    if (!onGround) {
      this.anims.stop();
      this.setFrame(PLAYER_FRAMES.walk);
    } else if (vx !== 0) {
      this.anims.play(WALK, true);
    } else {
      this.anims.stop();
      this.setFrame(PLAYER_FRAMES.idle);
    }
  }
}
