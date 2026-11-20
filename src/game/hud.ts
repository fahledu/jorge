// The HUD band on the canvas (ADR 0009; mockup "Jogo"): hearts, coins, points, time and
// level. It only draws the texts of `domain/hud.ts`, redrawing a field when its text changes.
import type Phaser from "phaser";
import { MAX_HEARTS } from "../domain/attempt.ts";
import type { HudFields } from "../domain/hud.ts";
import { GAME_WIDTH } from "../domain/scale.ts";
import { COIN_TILE, DIGIT_TILES, HEART_TILES } from "../domain/tiles.ts";

/** Positions of the mockup, px on the 480×270 screen. */
const HEIGHT = 22;
const BACKGROUND_ALPHA = 0.8;
const DEPTH = 100;
const ICON_Y = 2;
const HEART_X = [4, 22, 40] as const;
const COIN_X = 70;
const COINS_X = 90;
const POINTS_X = 190;
const CLOCK_X = 330;
/** "FASE" and the number: further left with 3 digits (level 100). */
const LEVEL_X = { word: 410, number: 440 } as const;
const LEVEL_X_WIDE = { word: 400, number: 430 } as const;
const LEVEL_WORD_BASELINE = 15;
const LEVEL_WORD_FONT = "bold 11px";
/** A digit tile is drawn every 10 px (its glyph is 10 px wide); the colon takes 6. */
const DIGIT_ADVANCE = 10;
const COLON_ADVANCE = 6;
/** The colon: two 2 px squares between the glyphs, at the height of the mockup. */
const COLON_DOT = 2;
const COLON_DX = 6;
const COLON_DY = [6, 11] as const;

export interface HudOptions {
  tiles: string;
  /** "FASE" (strings.ts), passed in by `createGame`. */
  levelWord: string;
  /** Font family of the UI token, for "FASE". */
  font: string;
  colors: { band: number; text: number };
}

/** A row of digit tiles (and colons) that is redrawn only when its text changes. */
class DigitField {
  readonly #scene: Phaser.Scene;
  readonly #tiles: string;
  readonly #color: number;
  #x: number;
  #text = "";
  #images: Phaser.GameObjects.Image[] = [];
  readonly #colons: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, tiles: string, x: number, color: number) {
    this.#scene = scene;
    this.#tiles = tiles;
    this.#x = x;
    this.#color = color;
    this.#colons = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH);
  }

  show(text: string, x = this.#x): void {
    if (text === this.#text && x === this.#x) return;
    this.#text = text;
    this.#x = x;
    this.#colons.clear().fillStyle(this.#color);
    let cursor = x;
    let used = 0;
    for (const char of text) {
      if (char === ":") {
        for (const dy of COLON_DY) {
          this.#colons.fillRect(cursor + COLON_DX, ICON_Y + dy, COLON_DOT, COLON_DOT);
        }
        cursor += COLON_ADVANCE;
        continue;
      }
      const image = this.#images[used] ?? this.#addImage();
      image
        .setFrame(DIGIT_TILES + Number(char))
        .setPosition(cursor, ICON_Y)
        .setVisible(true);
      used += 1;
      cursor += DIGIT_ADVANCE;
    }
    for (let i = used; i < this.#images.length; i += 1) this.#images[i]?.setVisible(false);
  }

  #addImage(): Phaser.GameObjects.Image {
    const image = this.#scene.add
      .image(0, ICON_Y, this.#tiles, DIGIT_TILES)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    this.#images.push(image);
    return image;
  }
}

export class Hud {
  readonly #hearts: Phaser.GameObjects.Image[];
  readonly #coins: DigitField;
  readonly #points: DigitField;
  readonly #clock: DigitField;
  readonly #level: DigitField;
  readonly #levelWord: Phaser.GameObjects.Text;
  #shownHearts = -1;
  #shownLevel = "";

  constructor(scene: Phaser.Scene, options: HudOptions) {
    const { tiles, colors } = options;
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor>(object: T): T =>
      object.setScrollFactor(0);
    fixed(scene.add.rectangle(0, 0, GAME_WIDTH, HEIGHT, colors.band, BACKGROUND_ALPHA))
      .setOrigin(0, 0)
      .setDepth(DEPTH);
    this.#hearts = HEART_X.slice(0, MAX_HEARTS).map((x) =>
      fixed(scene.add.image(x, ICON_Y, tiles, HEART_TILES.full))
        .setOrigin(0, 0)
        .setDepth(DEPTH),
    );
    fixed(scene.add.image(COIN_X, ICON_Y, tiles, COIN_TILE))
      .setOrigin(0, 0)
      .setDepth(DEPTH);
    const color = `#${colors.text.toString(16).padStart(6, "0")}`;
    this.#levelWord = fixed(
      scene.add.text(LEVEL_X.word, LEVEL_WORD_BASELINE, options.levelWord, {
        font: `${LEVEL_WORD_FONT} ${options.font}`,
        color,
      }),
    )
      .setOrigin(0, 1)
      .setDepth(DEPTH);
    this.#coins = new DigitField(scene, tiles, COINS_X, colors.text);
    this.#points = new DigitField(scene, tiles, POINTS_X, colors.text);
    this.#clock = new DigitField(scene, tiles, CLOCK_X, colors.text);
    this.#level = new DigitField(scene, tiles, LEVEL_X.number, colors.text);
  }

  update(fields: HudFields): void {
    if (fields.hearts !== this.#shownHearts) {
      this.#shownHearts = fields.hearts;
      this.#hearts.forEach((image, index) => {
        image.setFrame(index < fields.hearts ? HEART_TILES.full : HEART_TILES.empty);
      });
    }
    this.#coins.show(fields.coins);
    this.#points.show(fields.points);
    this.#clock.show(fields.clock);
    if (fields.level !== this.#shownLevel) {
      this.#shownLevel = fields.level;
      const x = fields.level.length > 2 ? LEVEL_X_WIDE : LEVEL_X;
      this.#levelWord.setX(x.word);
      this.#level.show(fields.level, x.number);
    }
  }
}
