import Phaser from "phaser";
import tilesUrl from "../../../assets/kenney/Tilemap/tilemap_packed.png";
import backgroundsUrl from "../../../assets/kenney/Tilemap/tilemap-backgrounds_packed.png";
import { GAME_HEIGHT, GAME_WIDTH } from "../../domain/scale.ts";
import { MAP_HEIGHT, TILE_SIZE } from "../../domain/tmj.ts";
import type { LevelData } from "../levels.ts";

const TILES = "tiles";
const BACKGROUNDS = "backgrounds";
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
/** Speed of the point the camera follows until the player exists (item 1c). */
const PROBE_SPEED = 60;

export interface LevelSceneData {
  level: LevelData;
}

/** Draws a level (background, terrain, decoration) with the camera sweeping it. */
export class LevelScene extends Phaser.Scene {
  #level!: LevelData; // set in init(), before preload() and create()
  #background: Phaser.GameObjects.TileSprite[] = [];
  readonly #probe = { x: 0, y: 0 };
  #direction = 1;

  constructor() {
    super("level");
  }

  init(data: LevelSceneData): void {
    this.#level = data.level;
  }

  preload(): void {
    this.load.image(TILES, tilesUrl);
    this.load.image(BACKGROUNDS, backgroundsUrl);
  }

  create(): void {
    const { info, tiled } = this.#level;
    const key = `level-${info.levelNumber}`;
    this.cache.tilemap.add(key, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: tiled });
    const map = this.make.tilemap({ key });
    const tileset = map.addTilesetImage(info.tilesetName, TILES);
    if (!tileset) throw new Error(`tileset ${info.tilesetName} not found in level ${key}`);

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

    map.createLayer("decor", tileset);
    map.createLayer("terrain", tileset);

    const width = info.widthInTiles * TILE_SIZE;
    const camera = this.cameras.main;
    camera.setBounds(0, 0, width, MAP_HEIGHT * TILE_SIZE);
    camera.setRoundPixels(true);
    this.#probe.x = info.start.x;
    this.#probe.y = info.start.y;
    camera.startFollow(this.#probe, true);
  }

  override update(_time: number, delta: number): void {
    const { start, flag } = this.#level.info;
    this.#probe.x += (this.#direction * PROBE_SPEED * delta) / 1000;
    if (this.#probe.x >= flag.x) this.#direction = -1;
    else if (this.#probe.x <= start.x) this.#direction = 1;
    const offset = Math.round(this.cameras.main.scrollX * BACKGROUND_SCROLL);
    for (const strip of this.#background) strip.tilePositionX = offset;
  }
}
