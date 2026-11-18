import Phaser from "phaser";
import charactersUrl from "../../../assets/kenney/Tilemap/tilemap-characters_packed.png";
import { GAME_HEIGHT, GAME_WIDTH } from "../../domain/scale";

const CHARACTERS = "characters";
/** Character tiles in the packed sheet (Tiled/tileset-characters.tsx). */
const CHARACTER_TILE = 24;

/** Placeholder scene of item 1a: the sky (canvas background) and the idle player. */
export class EmptyScene extends Phaser.Scene {
  constructor() {
    super("empty");
  }

  preload(): void {
    this.load.spritesheet(CHARACTERS, charactersUrl, {
      frameWidth: CHARACTER_TILE,
      frameHeight: CHARACTER_TILE,
    });
  }

  create(): void {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, CHARACTERS, 0);
  }
}
