import Phaser from "phaser";
import tilesUrl from "../../../assets/kenney/Tilemap/tilemap_packed.png";
import backgroundsUrl from "../../../assets/kenney/Tilemap/tilemap-backgrounds_packed.png";
import charactersUrl from "../../../assets/kenney/Tilemap/tilemap-characters_packed.png";
import {
  type AttemptState,
  type EnemyContact,
  type ItemContact,
  initialAttempt,
  invulnerabilityAlpha,
  stepAttempt,
} from "../../domain/attempt.ts";
import type { CommandFrame, CommandState } from "../../domain/commands.ts";
import { deathFinished, deathPose } from "../../domain/death.ts";
import {
  defeatFinished,
  defeatPose,
  ENEMY_SPEED,
  enemyBox,
  initialPatrol,
  isStomp,
  type PatrolState,
  stepPatrol,
} from "../../domain/enemies.ts";
import {
  ColumnIndex,
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
import { hudFields } from "../../domain/hud.ts";
import type { LevelEnemy, LevelItem } from "../../domain/level.ts";
import {
  initialMovement,
  knockback,
  type MovementState,
  type MovementStep,
  springBounce,
  springLaunches,
  stepMovement,
  stompBounce,
} from "../../domain/movement.ts";
import { isBelowMap, PLAYER_BODY, STEP_MS } from "../../domain/physics.ts";
import { GAME_HEIGHT, GAME_WIDTH } from "../../domain/scale.ts";
import { runningPoints, type ScoreSummary, scoreSummary } from "../../domain/score.ts";
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
import { Enemy } from "../entities/enemy.ts";
import { CHARACTERS, Player } from "../entities/player.ts";
import type { EventBus } from "../events.ts";
import { Hud } from "../hud.ts";
import type { LevelData } from "../levels.ts";

const TILES = "tiles";
const BACKGROUNDS = "backgrounds";
const FLAG_WAVE = "flag-wave";
/** Flag cloth animation, frames per second. */
const FLAG_FPS = 4;
/**
 * First theme of the background sheet (4 tiles of 24 px wide, opaque): sky, a band of
 * clouds and hills, and a base. The band starts 2 tiles above the ground under the start
 * and ends 12 px above it (plan 1g, decision 4: top at 180 px on level 1, ground on row 12),
 * so the hills show behind the
 * terrain; sky above it, base below. It does not follow the ground along the level.
 */
const BAND_HEIGHT = 24;
const BAND_ABOVE_GROUND = 2 * TILE_SIZE;

function backgroundStrips(groundRow: number) {
  const top = Math.min(
    Math.max(0, groundRow * TILE_SIZE - BAND_ABOVE_GROUND),
    GAME_HEIGHT - BAND_HEIGHT,
  );
  return [
    { frame: "sky", sheetY: 0, y: 0, height: top },
    { frame: "band", sheetY: 24, y: top, height: BAND_HEIGHT },
    { frame: "base", sheetY: 48, y: top + BAND_HEIGHT, height: GAME_HEIGHT - top - BAND_HEIGHT },
  ];
}
const THEME_WIDTH = 96;
/** The background scrolls at half the speed of the terrain (plan 1b). */
const BACKGROUND_SCROLL = 0.5;
/** The spring shows compressed this long after a launch, ms (plan 1d). */
const SPRING_COMPRESSED_MS = 150;
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
  colors: { hud: number; text: number; halo: number };
  /** "FASE" on the HUD (strings.ts) and the UI font family (tokens). */
  levelWord: string;
  font: string;
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

interface EnemyEntry {
  info: LevelEnemy;
  patrol: PatrolState;
  box: Rect;
  sprite: Enemy;
  /** Time since it was defeated, ms; null while alive. */
  defeatedMs: number | null;
}

/** What the E2E test hooks read about an enemy (ADR 0010). */
export interface EnemySnapshot {
  id: number;
  type: LevelEnemy["type"];
  x: number;
  y: number;
  col: number;
  row: number;
  defeated: boolean;
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
  #enemies: EnemyEntry[] = [];
  // Still things by column (plan 1g, decision 5): a step looks only where the player is.
  #spikeIndex = new ColumnIndex<Rect>([], (box) => box, 0);
  #pickupIndex = new ColumnIndex<Pickup>([], (pickup) => pickup.box, 0);
  #springIndex = new ColumnIndex<Spring>([], (spring) => spring.box, 0);
  // Reused every step, emptied by the queries: nothing is allocated when nothing is touched.
  readonly #nearSpikes: Rect[] = [];
  readonly #nearPickups: Pickup[] = [];
  readonly #nearSprings: Spring[] = [];
  readonly #touchedSpikes: Rect[] = [];
  readonly #itemContacts: ItemContact[] = [];
  readonly #enemyContacts: (EnemyContact & { box: Rect })[] = [];
  readonly #box: Rect = { left: 0, top: 0, right: 0, bottom: 0 };
  /** Test hook: enemies stand still (kept across restarts). */
  #enemiesFrozen = false;
  #mounts = 0;
  #hud!: Hud; // set in create()
  /** Test hook: the summary of the last completed attempt (kept across restarts). */
  #lastSummary: ScoreSummary | null = null;
  #dying: Dying | null = null;
  #wings!: Phaser.GameObjects.Image; // set in create()
  #halo!: Phaser.GameObjects.Graphics; // set in create()

  constructor() {
    super("level");
  }

  get status(): LevelStatus {
    return this.#status;
  }

  /** Goes up every time the scene starts (a new level or a restart); for the test hooks. */
  get mounts(): number {
    return this.#mounts;
  }

  get attempt(): number {
    return this.#data.attempt;
  }

  /** What the level file holds (spawns, spikes). */
  get levelInfo(): LevelData["info"] {
    return this.#data.level.info;
  }

  /** Hearts, coins and invulnerability of the current attempt. */
  get attemptState(): AttemptState {
    return this.#attempt;
  }

  /** The summary of the last time the flag was touched, or null. */
  get lastSummary(): ScoreSummary | null {
    return this.#lastSummary;
  }

  init(data: LevelSceneData): void {
    this.#mounts += 1;
    this.#data = data;
    this.#movement = initialMovement();
    this.#onGround = false;
    this.#status = "loading";
    this.#attempt = initialAttempt();
    this.#pickups = [];
    this.#springs = [];
    this.#enemies = [];
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

    this.#createBackground(info.groundRow);
    map.createLayer("decor", tileset);
    const terrain = map.createLayer("terrain", tileset);
    if (!terrain) throw new Error(`level ${key} has no terrain layer`);
    // Every terrain tile is solid on all four sides (plan 1c, decision 10), except the
    // spikes (plan 1d, decision 1). Phaser's tile index is the GID, not the local id.
    terrain.setCollisionByExclusion([-1, ...SPIKE_TILES.map(gidOf)]);
    this.#spikeIndex = new ColumnIndex(info.spikes.map(spikeBox), (box) => box, info.widthInTiles);

    this.#flag = flagZone(info.flag);
    this.#createFlag(info.flag);
    this.#createItems(info.items);
    this.#pickupIndex = new ColumnIndex(this.#pickups, (pickup) => pickup.box, info.widthInTiles);
    this.#springIndex = new ColumnIndex(this.#springs, (spring) => spring.box, info.widthInTiles);
    this.#createEnemies(info.enemies);

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
    this.#hud = new Hud(this, {
      tiles: TILES,
      levelWord: this.#data.levelWord,
      font: this.#data.font,
      colors: { band: this.#data.colors.hud, text: this.#data.colors.text },
    });
    this.#showHud();

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
    bus.emit("attemptStarted", { levelNumber: info.levelNumber, attempt: this.#data.attempt });
  }

  override update(): void {
    if (this.#status !== "dying") this.#player.show(this.#onGround);
    this.#showHud();
    const offset = Math.round(this.cameras.main.scrollX * BACKGROUND_SCROLL);
    for (const strip of this.#background) strip.tilePositionX = offset;
  }

  /** Stops the level (Esc/P, focus lost); ignored unless playing. */
  pauseLevel(): void {
    if (this.#status !== "playing") return;
    this.#status = "paused";
    this.#data.controls.setEnabled(false);
    this.scene.pause();
    // The HUD shows the same time and points as the pause line.
    this.#showHud();
    this.#data.bus.emit("paused", {
      levelNumber: this.#data.level.info.levelNumber,
      elapsedMs: this.#attempt.elapsedMs,
      points: runningPoints(this.#attempt.events),
    });
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

  /** Test hook: the enemies of the level, alive or defeated. */
  enemySnapshots(): EnemySnapshot[] {
    return this.#enemies.map(({ info, patrol, defeatedMs }) => ({
      id: info.id,
      type: info.type,
      x: patrol.x,
      y: info.y,
      col: Math.floor(patrol.x / TILE_SIZE),
      row: info.row,
      defeated: defeatedMs !== null,
    }));
  }

  /** Test hook: stops or restarts the enemies' patrol. */
  freezeEnemies(frozen: boolean): void {
    this.#enemiesFrozen = frozen;
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
    // The speed that moved the body in this step, before the control changes it (stomp).
    const movedVy = body.velocity.y;
    // Enemies move at the start of the step (ADR 0006).
    this.#stepEnemies();
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
    const box = this.#box;
    box.left = body.left;
    box.top = body.top;
    box.right = body.right;
    box.bottom = body.bottom;
    const touchedSpikes = this.#touchedSpikes;
    touchedSpikes.length = 0;
    for (const spike of this.#spikeIndex.query(box.left, box.right, this.#nearSpikes)) {
      if (overlaps(box, spike)) touchedSpikes.push(spike);
    }
    const enemyContacts = this.#enemyContacts;
    enemyContacts.length = 0;
    for (const enemy of this.#enemies) {
      if (enemy.defeatedMs !== null || !overlaps(box, enemy.box)) continue;
      const { id, type } = enemy.info;
      enemyContacts.push({ id, type, stomp: isStomp(box, movedVy, enemy.box), box: enemy.box });
    }
    const itemContacts = this.#itemContacts;
    itemContacts.length = 0;
    for (const pickup of this.#pickupIndex.query(box.left, box.right, this.#nearPickups)) {
      if (overlaps(box, pickup.box)) itemContacts.push(pickup.contact);
    }
    const result = stepAttempt(
      this.#attempt,
      {
        items: itemContacts,
        enemies: enemyContacts,
        hazard: touchedSpikes.length > 0,
        flag: overlaps(box, this.#flag),
      },
      STEP_MS,
    );
    this.#attempt = result.state;
    for (const item of result.collected) {
      this.#pickups.find((pickup) => pickup.contact.id === item.id)?.image.setVisible(false);
    }
    for (const defeated of result.defeated) {
      const enemy = this.#enemies.find((candidate) => candidate.info.id === defeated.id);
      if (enemy) enemy.defeatedMs = 0;
    }
    this.#player.setAlpha(invulnerabilityAlpha(this.#attempt, this.#data.reduceEffects()));

    if (result.outcome === "completed") {
      this.#complete();
      return;
    }
    if (result.outcome === "dead") {
      this.#die(false);
      return;
    }
    // Impulse of the step (ADR 0006): a push wins over the bounce, the bounce over a spring.
    if (result.hurt) {
      const center = (rect: Rect): number => (rect.left + rect.right) / 2;
      // Only on the step that hurts: the average centre of what hurt.
      let sum = 0;
      let count = 0;
      for (const spike of touchedSpikes) {
        sum += center(spike);
        count += 1;
      }
      for (const contact of enemyContacts) {
        if (contact.stomp) continue;
        sum += center(contact.box);
        count += 1;
      }
      const direction = knockbackDirection(center(box), sum / count, this.#player.facing);
      this.#apply(knockback(direction));
    } else if (result.stomped) {
      this.#apply(stompBounce(control.vx));
    }
    if (springLaunches(control.vy, result.hurt, result.stomped)) {
      const near = this.#springIndex.query(box.left, box.right, this.#nearSprings);
      const spring = near.find((candidate) => overlaps(box, candidate.box));
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

  /** Patrol of the live enemies while playing; the defeat effect of the others. */
  #stepEnemies(): void {
    const reduceEffects = this.#data.reduceEffects();
    for (const enemy of this.#enemies) {
      if (enemy.defeatedMs !== null) {
        if (!enemy.sprite.visible) continue;
        enemy.defeatedMs += STEP_MS;
        if (defeatFinished(enemy.defeatedMs, reduceEffects)) enemy.sprite.setVisible(false);
        else enemy.sprite.showDefeat(defeatPose(enemy.defeatedMs, reduceEffects));
        continue;
      }
      if (this.#status !== "playing" || this.#enemiesFrozen) continue;
      const { type, row, range } = enemy.info;
      enemy.patrol = stepPatrol(enemy.patrol, range, ENEMY_SPEED[type], STEP_MS);
      enemy.box = enemyBox(type, enemy.patrol.x, row);
      enemy.sprite.place(enemy.patrol.x, enemy.patrol.direction);
    }
  }

  /** Death by 0 hearts or by falling (ADR 0006): the angel effect, then a restart. */
  #die(fell: boolean): void {
    this.#status = "dying";
    this.#data.controls.setEnabled(false);
    this.#data.bus.emit("attemptLost", {
      levelNumber: this.#data.level.info.levelNumber,
      reason: fell ? "fell" : "hearts",
    });
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
    const { info } = this.#data.level;
    const summary = scoreSummary(this.#attempt.events, info, this.#attempt.elapsedMs);
    this.#lastSummary = summary;
    this.#showHud();
    this.#data.bus.emit("levelCompleted", { levelNumber: info.levelNumber, summary });
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

  #createEnemies(enemies: readonly LevelEnemy[]): void {
    this.#enemies = enemies.map((info) => {
      const patrol = initialPatrol(info.range, info.x);
      const sprite = new Enemy(this, info.type, patrol.x, info.row);
      sprite.place(patrol.x, patrol.direction);
      return {
        info,
        patrol,
        box: enemyBox(info.type, patrol.x, info.row),
        sprite,
        defeatedMs: null,
      };
    });
  }

  #showHud(): void {
    this.#hud.update(hudFields(this.#attempt, this.#data.level.info.levelNumber));
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

  #createBackground(groundRow: number): void {
    const sheet = this.textures.get(BACKGROUNDS).getSourceImage();
    if (!(sheet instanceof HTMLImageElement)) throw new Error("background sheet is not an image");
    this.#background = backgroundStrips(groundRow).map((strip) => {
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
