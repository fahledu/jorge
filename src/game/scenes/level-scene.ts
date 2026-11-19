import Phaser from "phaser";
import tilesUrl from "../../../assets/kenney/Tilemap/tilemap_packed.png";
import backgroundsUrl from "../../../assets/kenney/Tilemap/tilemap-backgrounds_packed.png";
import charactersUrl from "../../../assets/kenney/Tilemap/tilemap-characters_packed.png";
import {
  type AttemptState,
  type ItemContact,
  initialAttempt,
  invulnerabilityAlpha,
  MAX_HEARTS,
  stepAttempt,
} from "../../domain/attempt.ts";
import type { CommandFrame, CommandState } from "../../domain/commands.ts";
import { deathFinished, deathPose } from "../../domain/death.ts";
import {
  cellOf,
  feetIn,
  flagZone,
  itemBox,
  knockbackDirection,
  overlaps,
  type Rect,
  spikeBox,
  springBox,
} from "../../domain/geometry.ts";
import type { LevelItem } from "../../domain/level.ts";
import {
  initialMovement,
  knockback,
  type MovementState,
  type MovementStep,
  springBounce,
  springLaunches,
  stepMovement,
} from "../../domain/movement.ts";
import { isBelowMap, PLAYER_BODY, STEP_MS } from "../../domain/physics.ts";
import { GAME_HEIGHT, GAME_WIDTH } from "../../domain/scale.ts";
import {
  COIN_TILE,
  FLAG_TILES,
  gidOf,
  HEART_TILES,
  SPIKE_TILES,
  SPRING_TILES,
  WINGS_TILE,
} from "../../domain/tiles.ts";
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
/** The spring shows compressed this long after a launch, ms (plan 1d). */
const SPRING_COMPRESSED_MS = 150;
/** HUD band of the mockup: height, opacity of the background, hearts' positions. */
const HUD_HEIGHT = 22;
const HUD_ALPHA = 0.8;
const HUD_HEART_X = [4, 22, 40] as const;
const HUD_HEART_Y = 2;
const HUD_DEPTH = 100;
/** Halo of the death effect: ellipse size and line, px; how far above the frame. */
const HALO = { width: 10, height: 3, line: 1, above: 1 } as const;
/**
 * The wings tile (18 px) is narrower than the player (24 px): drawn at twice the size
 * (whole scale, crisp pixels) so they stick out on both sides. The drawing fills the
 * bottom half of the tile, so the origin sits on it; a flap lifts them a little.
 */
const WINGS_SCALE = 2;
const WINGS_ORIGIN_Y = 0.75;
const WINGS_RISE = 2;
const WINGS_FLAP_PX = 2;

/** Who owns the keyboard: the level while playing, the menus otherwise. */
export interface LevelControls {
  commands: CommandState;
  setEnabled(enabled: boolean): void;
}

export interface LevelSceneData {
  level: LevelData;
  bus: EventBus;
  controls: LevelControls;
  /** Starts at 1 and goes up on every restart (death or "play again"). */
  attempt: number;
  /** "Reduce effects" now: no blinking nor motion in the effects (ADR 0009). */
  reduceEffects: () => boolean;
  /** Colors from the design tokens, as 0xRRGGBB. */
  colors: { hud: number; halo: number };
}

export type LevelStatus = "playing" | "paused" | "completed" | "dying" | "loading";

/** A coin or heart on the map. */
interface Pickup {
  contact: ItemContact;
  box: Rect;
  image: Phaser.GameObjects.Image;
}

interface Spring {
  box: Rect;
  image: Phaser.GameObjects.Image;
  compressedMs: number;
}

interface Dying {
  elapsedMs: number;
  /** Centre of the player's frame where it died, world px. */
  x: number;
  y: number;
  /** Top of the frame on the screen, px. */
  screenTop: number;
}

/** What the E2E test hooks read (ADR 0010). */
export interface PlayerSnapshot {
  x: number;
  y: number;
  bottom: number;
  vx: number;
  vy: number;
  onGround: boolean;
  /** Opacity of the sprite (blinking, death effect). */
  alpha: number;
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
  #attempt: AttemptState = initialAttempt();
  #pickups: Pickup[] = [];
  #springs: Spring[] = [];
  #spikes: Rect[] = [];
  #hearts: Phaser.GameObjects.Image[] = [];
  #shownHearts = -1;
  #dying: Dying | null = null;
  #wings!: Phaser.GameObjects.Image; // set in create()
  #halo!: Phaser.GameObjects.Graphics; // set in create()

  constructor() {
    super("level");
  }

  get status(): LevelStatus {
    return this.#status;
  }

  get attempt(): number {
    return this.#data.attempt;
  }

  /** Hearts, coins and invulnerability of the current attempt. */
  get attemptState(): AttemptState {
    return this.#attempt;
  }

  init(data: LevelSceneData): void {
    this.#data = data;
    this.#movement = initialMovement();
    this.#onGround = false;
    this.#status = "loading";
    this.#attempt = initialAttempt();
    this.#pickups = [];
    this.#springs = [];
    this.#spikes = [];
    this.#hearts = [];
    this.#shownHearts = -1;
    this.#dying = null;
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
    // Every terrain tile is solid on all four sides (plan 1c, decision 10), except the
    // spikes (plan 1d, decision 1). Phaser's tile index is the GID, not the local id.
    terrain.setCollisionByExclusion([-1, ...SPIKE_TILES.map(gidOf)]);
    this.#spikes = info.spikes.map(spikeBox);

    this.#flag = flagZone(info.flag);
    this.#createFlag(info.flag);
    this.#createItems(info.items);

    const width = info.widthInTiles * TILE_SIZE;
    const height = MAP_HEIGHT * TILE_SIZE;
    // Walls left, right and up; open at the bottom, where the player falls out (ADR 0006).
    this.physics.world.setBounds(0, 0, width, height, true, true, true, false);
    this.#wings = this.add
      .image(0, 0, TILES, WINGS_TILE)
      .setScale(WINGS_SCALE)
      .setOrigin(0.5, WINGS_ORIGIN_Y)
      .setVisible(false);
    this.#player = new Player(this, feetIn(cellOf(info.start)));
    this.physics.add.collider(this.#player, terrain);
    // Default depth on purpose: the angel passes under the HUD band on its way out.
    this.#halo = this.add.graphics().setVisible(false);
    this.#createHud();

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
    if (this.#status !== "dying") this.#player.show(this.#onGround);
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
      alpha: this.#player.alpha,
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
    if (this.#status === "dying") {
      this.#stepDeath();
      return;
    }
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
    this.#apply(control);
    this.#stepSprings();

    if (this.#status !== "playing") return;
    if (isBelowMap(body.top)) {
      this.#die(true);
      return;
    }
    const box = { left: body.left, top: body.top, right: body.right, bottom: body.bottom };
    const touchedSpikes = this.#spikes.filter((spike) => overlaps(box, spike));
    const result = stepAttempt(
      this.#attempt,
      {
        items: this.#pickups
          .filter((pickup) => overlaps(box, pickup.box))
          .map((pickup) => pickup.contact),
        hazard: touchedSpikes.length > 0,
        flag: overlaps(box, this.#flag),
      },
      STEP_MS,
    );
    this.#attempt = result.state;
    for (const item of result.collected) {
      this.#pickups.find((pickup) => pickup.contact.id === item.id)?.image.setVisible(false);
    }
    this.#showHearts();
    this.#player.setAlpha(invulnerabilityAlpha(this.#attempt, this.#data.reduceEffects()));

    if (result.outcome === "completed") {
      this.#complete();
      return;
    }
    if (result.outcome === "dead") {
      this.#die(false);
      return;
    }
    if (result.hurt) {
      const center = (rect: Rect): number => (rect.left + rect.right) / 2;
      const source = touchedSpikes.reduce((sum, spike) => sum + center(spike), 0);
      const direction = knockbackDirection(
        center(box),
        source / touchedSpikes.length,
        this.#player.facing,
      );
      this.#apply(knockback(direction));
    }
    if (springLaunches(control.vy, result.hurt)) {
      const spring = this.#springs.find((candidate) => overlaps(box, candidate.box));
      if (spring) {
        this.#apply(springBounce(control.vx));
        spring.compressedMs = SPRING_COMPRESSED_MS;
        spring.image.setFrame(SPRING_TILES.compressed);
      }
    }
    if (input.pausePressed) this.pauseLevel();
  }

  #apply(step: MovementStep): void {
    this.#movement = step.state;
    this.#player.body.setVelocity(step.vx, step.vy);
  }

  #stepSprings(): void {
    for (const spring of this.#springs) {
      if (spring.compressedMs <= 0) continue;
      spring.compressedMs -= STEP_MS;
      if (spring.compressedMs < 1e-6) {
        spring.compressedMs = 0;
        spring.image.setFrame(SPRING_TILES.extended);
      }
    }
  }

  /** Death by 0 hearts or by falling (ADR 0006): the angel effect, then a restart. */
  #die(fell: boolean): void {
    this.#status = "dying";
    this.#data.controls.setEnabled(false);
    const body = this.#player.body;
    body.stop();
    body.enable = false;
    const camera = this.cameras.main;
    camera.stopFollow();
    const half = PLAYER_BODY.frameSize / 2;
    // A fall rises from the bottom edge of the screen, in the column it fell.
    const y = fell ? camera.scrollY + GAME_HEIGHT - half : this.#player.y;
    // Whole pixels: positions set by hand are not rounded by the camera.
    const x = Math.round(this.#player.x);
    const top = Math.round(y);
    this.#dying = { elapsedMs: 0, x, y: top, screenTop: Math.round(top - half - camera.scrollY) };
    this.#player.freeze();
    this.#wings.setVisible(true);
    this.#halo
      .clear()
      .lineStyle(HALO.line, this.#data.colors.halo)
      .strokeEllipse(0, 0, HALO.width, HALO.height)
      .setVisible(true);
    this.#showDeath();
  }

  #stepDeath(): void {
    const dying = this.#dying;
    if (!dying) return;
    dying.elapsedMs += STEP_MS;
    if (deathFinished(dying.elapsedMs, dying.screenTop, this.#data.reduceEffects())) {
      this.#restart();
      return;
    }
    this.#showDeath();
  }

  #showDeath(): void {
    const dying = this.#dying;
    if (!dying) return;
    const pose = deathPose(dying.elapsedMs, this.#data.reduceEffects());
    const x = dying.x + pose.dx;
    const y = dying.y + pose.dy;
    this.#player.setPosition(x, y).setAlpha(pose.alpha);
    this.#wings
      .setPosition(x, y - WINGS_RISE - (pose.wingsUp ? WINGS_FLAP_PX : 0))
      .setAlpha(pose.alpha);
    this.#halo.setPosition(x, y - PLAYER_BODY.frameSize / 2 - HALO.above).setAlpha(pose.alpha);
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

  #createItems(items: readonly LevelItem[]): void {
    for (const item of items) {
      const cell = cellOf(item);
      const x = cell.col * TILE_SIZE;
      const y = cell.row * TILE_SIZE;
      if (item.type === "spring") {
        const image = this.add.image(x, y, TILES, SPRING_TILES.extended).setOrigin(0, 0);
        this.#springs.push({ box: springBox(cell), image, compressedMs: 0 });
        continue;
      }
      const frame = item.type === "coin" ? COIN_TILE : HEART_TILES.full;
      this.#pickups.push({
        contact: { id: item.id, type: item.type },
        box: itemBox(cell),
        image: this.add.image(x, y, TILES, frame).setOrigin(0, 0),
      });
    }
  }

  /** The HUD band of the mockup, with the hearts only; item 1f adds the rest. */
  #createHud(): void {
    this.add
      .rectangle(0, 0, GAME_WIDTH, HUD_HEIGHT, this.#data.colors.hud, HUD_ALPHA)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);
    this.#hearts = HUD_HEART_X.slice(0, MAX_HEARTS).map((x) =>
      this.add
        .image(x, HUD_HEART_Y, TILES, HEART_TILES.full)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH),
    );
    this.#showHearts();
  }

  #showHearts(): void {
    const hearts = this.#attempt.hearts;
    if (hearts === this.#shownHearts) return;
    this.#shownHearts = hearts;
    this.#hearts.forEach((image, index) => {
      image.setFrame(index < hearts ? HEART_TILES.full : HEART_TILES.empty);
    });
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
