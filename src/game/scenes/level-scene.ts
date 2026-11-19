import Phaser from "phaser";
import tilesUrl from "../../../assets/kenney/Tilemap/tilemap_packed.png";
import backgroundsUrl from "../../../assets/kenney/Tilemap/tilemap-backgrounds_packed.png";
import charactersUrl from "../../../assets/kenney/Tilemap/tilemap-characters_packed.png";
import type { CommandFrame, CommandState } from "../../domain/commands.ts";
import { cellOf, feetIn, flagZone, overlaps, type Rect } from "../../domain/geometry.ts";
import { initialMovement, type MovementState, stepMovement } from "../../domain/movement.ts";
import { isBelowMap, STEP_MS } from "../../domain/physics.ts";
import { GAME_HEIGHT, GAME_WIDTH } from "../../domain/scale.ts";
import { FLAG_TILES } from "../../domain/tiles.ts";
import { MAP_HEIGHT, TILE_SIZE } from "../../domain/tmj.ts";
import { CHARACTERS, Player } from "../entities/player.ts";
import type { EventBus } from "../events.ts";
import type { LevelData } from "../levels.ts";

const TILES = "tiles";
const BACKGROUNDS = "backgrounds";
const FLAG_WAVE = "flag-wave";
/** Flag cloth animation, frames per second. */
const FLAG_FPS = 4;
/**
 * First theme of the background sheet (4 tiles of 24 px wide, opaque): sky, a band of
 * clouds and hills, and a base. The band sits just above the ground row of the tutorial
 * (row 12), so the hills show behind the terrain; sky above it, base below.
 */
// Fixed for level 1 (ground on row 12); provisional until levels with other ground rows (1g).
const BAND_TOP = 180;
const BAND_HEIGHT = 24;
const BACKGROUND_STRIPS = [
  { frame: "sky", sheetY: 0, y: 0, height: BAND_TOP },
  { frame: "band", sheetY: 24, y: BAND_TOP, height: BAND_HEIGHT },
  {
    frame: "base",
    sheetY: 48,
    y: BAND_TOP + BAND_HEIGHT,
    height: GAME_HEIGHT - BAND_TOP - BAND_HEIGHT,
  },
] as const;
const THEME_WIDTH = 96;
/** The background scrolls at half the speed of the terrain (plan 1b). */
const BACKGROUND_SCROLL = 0.5;

/** Who owns the keyboard: the level while playing, the menus otherwise. */
export interface LevelControls {
  commands: CommandState;
  setEnabled(enabled: boolean): void;
}

export interface LevelSceneData {
  level: LevelData;
  bus: EventBus;
  controls: LevelControls;
  /** Starts at 1 and goes up on every restart (fall or "play again"). */
  attempt: number;
}

export type LevelStatus = "playing" | "paused" | "completed" | "loading";

/** What the E2E test hooks read (ADR 0010). */
export interface PlayerSnapshot {
  x: number;
  y: number;
  bottom: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

const NO_INPUT: CommandFrame = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
  pausePressed: false,
};

/** One attempt at a level: terrain, player, flag, pause and restart. */
export class LevelScene extends Phaser.Scene {
  #data!: LevelSceneData; // set in init(), before preload() and create()
  #background: Phaser.GameObjects.TileSprite[] = [];
  #player!: Player; // set in create()
  #movement: MovementState = initialMovement();
  #onGround = false;
  #flag!: Rect; // set in create()
  #status: LevelStatus = "loading";

  constructor() {
    super("level");
  }

  get status(): LevelStatus {
    return this.#status;
  }

  get attempt(): number {
    return this.#data.attempt;
  }

  init(data: LevelSceneData): void {
    this.#data = data;
    this.#movement = initialMovement();
    this.#onGround = false;
    this.#status = "loading";
  }

  preload(): void {
    if (!this.textures.exists(TILES)) {
      this.load.spritesheet(TILES, tilesUrl, { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
    }
    if (!this.textures.exists(BACKGROUNDS)) this.load.image(BACKGROUNDS, backgroundsUrl);
    if (!this.textures.exists(CHARACTERS)) {
      this.load.spritesheet(CHARACTERS, charactersUrl, { frameWidth: 24, frameHeight: 24 });
    }
  }

  create(): void {
    const { info, tiled } = this.#data.level;
    const key = `level-${info.levelNumber}`;
    if (!this.cache.tilemap.exists(key)) {
      this.cache.tilemap.add(key, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: tiled });
    }
    const map = this.make.tilemap({ key });
    const tileset = map.addTilesetImage(info.tilesetName, TILES);
    if (!tileset) throw new Error(`tileset ${info.tilesetName} not found in level ${key}`);

    this.#createBackground();
    map.createLayer("decor", tileset);
    const terrain = map.createLayer("terrain", tileset);
    if (!terrain) throw new Error(`level ${key} has no terrain layer`);
    // Every terrain tile is solid on all four sides (plan 1c, decision 10).
    terrain.setCollisionByExclusion([-1]);

    this.#flag = flagZone(info.flag);
    this.#createFlag(info.flag);

    const width = info.widthInTiles * TILE_SIZE;
    const height = MAP_HEIGHT * TILE_SIZE;
    // Walls left, right and up; open at the bottom, where the player falls out (ADR 0006).
    this.physics.world.setBounds(0, 0, width, height, true, true, true, false);
    this.#player = new Player(this, feetIn(cellOf(info.start)));
    this.physics.add.collider(this.#player, terrain);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, width, height);
    camera.setRoundPixels(true);
    camera.startFollow(this.#player, true);

    const { bus, controls } = this.#data;
    // Kept here: by the time SHUTDOWN fires, the Arcade plugin has dropped its world.
    const world = this.physics.world;
    world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.#step, this);
    bus.on("resumeRequested", this.#resume);
    bus.on("restartRequested", this.#restartFromMenu);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.#step, this);
      bus.off("resumeRequested", this.#resume);
      bus.off("restartRequested", this.#restartFromMenu);
    });
    this.#status = "playing";
    controls.setEnabled(true);
  }

  override update(): void {
    this.#player.show(this.#onGround);
    const offset = Math.round(this.cameras.main.scrollX * BACKGROUND_SCROLL);
    for (const strip of this.#background) strip.tilePositionX = offset;
  }

  /** Stops the level (Esc/P, focus lost); ignored unless playing. */
  pauseLevel(): void {
    if (this.#status !== "playing") return;
    this.#status = "paused";
    this.#data.controls.setEnabled(false);
    this.scene.pause();
    this.#data.bus.emit("paused", { levelNumber: this.#data.level.info.levelNumber });
  }

  playerSnapshot(): PlayerSnapshot {
    const body = this.#player.body;
    return {
      x: body.center.x,
      y: body.center.y,
      bottom: body.bottom,
      vx: body.velocity.x,
      vy: body.velocity.y,
      onGround: this.#onGround,
    };
  }

  /** Test hook: stands the player in a cell, still. */
  placePlayer(col: number, row: number): void {
    this.#player.placeFeet(feetIn({ col, row }));
    this.#movement = initialMovement();
    this.#onGround = false;
  }

  /** Test hook: stands the player 2 columns left of the flag. */
  goToFlag(): void {
    const { col, row } = cellOf(this.#data.level.info.flag);
    this.placePlayer(col - 2, row);
  }

  /** Runs after each Arcade step (see domain/physics.ts for the order). */
  #step(): void {
    if (this.#status === "loading") return;
    const body = this.#player.body;
    this.#onGround = body.blocked.down;
    // Only the first step of a frame resets the flags in Phaser; extra steps would keep
    // `blocked.down` from the step before and let the player jump twice.
    body.resetFlags();

    const input = this.#status === "playing" ? this.#data.controls.commands.frame() : NO_INPUT;
    const control = stepMovement(
      this.#movement,
      { ...input, onGround: this.#onGround, vy: body.velocity.y },
      STEP_MS,
    );
    this.#movement = control.state;
    body.setVelocity(control.vx, control.vy);

    if (this.#status !== "playing") return;
    if (isBelowMap(body.top)) {
      this.#restart();
      return;
    }
    const box = { left: body.left, top: body.top, right: body.right, bottom: body.bottom };
    if (overlaps(box, this.#flag)) this.#complete();
    else if (input.pausePressed) this.pauseLevel();
  }

  #complete(): void {
    this.#status = "completed";
    this.#data.controls.setEnabled(false);
    this.#player.body.setVelocityX(0);
    this.#data.bus.emit("levelCompleted", { levelNumber: this.#data.level.info.levelNumber });
  }

  readonly #resume = (): void => {
    if (this.#status !== "paused") return;
    this.#status = "playing";
    this.scene.resume();
    this.#data.controls.setEnabled(true);
  };

  readonly #restartFromMenu = (): void => {
    if (this.#status === "completed") this.#restart();
  };

  #restart(): void {
    this.#status = "loading";
    this.#data.controls.setEnabled(false);
    this.scene.restart({ ...this.#data, attempt: this.#data.attempt + 1 });
  }

  #createFlag(point: { x: number; y: number }): void {
    const { col, row } = cellOf(point);
    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;
    this.add.image(x, y, TILES, FLAG_TILES.pole).setOrigin(0, 0);
    if (!this.anims.exists(FLAG_WAVE)) {
      this.anims.create({
        key: FLAG_WAVE,
        frames: this.anims.generateFrameNumbers(TILES, { frames: [...FLAG_TILES.cloth] }),
        frameRate: FLAG_FPS,
        repeat: -1,
      });
    }
    this.add
      .sprite(x, y - TILE_SIZE, TILES, FLAG_TILES.cloth[0])
      .setOrigin(0, 0)
      .play(FLAG_WAVE);
  }

  #createBackground(): void {
    const sheet = this.textures.get(BACKGROUNDS).getSourceImage();
    if (!(sheet instanceof HTMLImageElement)) throw new Error("background sheet is not an image");
    this.#background = BACKGROUND_STRIPS.map((strip) => {
      // A texture of its own per strip: a tile sprite of a frame inside the sheet samples
      // the neighbouring rows at its edges and shows seams.
      const textureKey = `${BACKGROUNDS}-${strip.frame}`;
      if (!this.textures.exists(textureKey)) {
        const texture = this.textures.createCanvas(textureKey, THEME_WIDTH, BAND_HEIGHT);
        if (!texture) throw new Error(`could not create texture ${textureKey}`);
        texture.context.drawImage(
          sheet,
          0,
          strip.sheetY,
          THEME_WIDTH,
          BAND_HEIGHT,
          0,
          0,
          THEME_WIDTH,
          BAND_HEIGHT,
        );
        texture.refresh();
      }
      return this.add
        .tileSprite(0, strip.y, GAME_WIDTH, strip.height, textureKey)
        .setOrigin(0, 0)
        .setScrollFactor(0);
    });
  }
}
