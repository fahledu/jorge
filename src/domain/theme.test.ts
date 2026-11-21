import { describe, expect, it } from "vitest";
import { tierOf } from "./curve.ts";
import { isSolid, isSpike } from "./enemies.ts";
import { applyTheme, lookOf, PROVISIONAL_THEME, THEMES, type Theme, themeOf } from "./theme.ts";
import { BASE_PALETTE, THEME_TILES } from "./tiles.ts";

const BASE_THEMES: Theme[] = ["meadow", "forest", "desert", "cave", "snow"];

describe("themeOf", () => {
  it("gives the ten themes in the order of the tiers", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(themeOf)).toEqual([...THEMES]);
  });
  it("maps levels to themes", () => {
    const levels = [10, 11, 30, 31, 41, 51, 61, 71, 90, 91, 100];
    expect(levels.map((n) => themeOf(tierOf(n)))).toEqual([
      "meadow",
      "forest",
      "farm",
      "desert",
      "cave",
      "factory",
      "temple",
      "snow",
      "candy",
      "castle",
      "castle",
    ]);
  });
  it("rejects a tier outside 1 to 10", () => {
    expect(() => themeOf(0)).toThrow(/tier/);
    expect(() => themeOf(11)).toThrow(/tier/);
  });
});

describe("lookOf", () => {
  it("borrows the look of the expansion themes", () => {
    expect((["farm", "factory", "temple", "candy", "castle"] as const).map(lookOf)).toEqual([
      "meadow",
      "cave",
      "desert",
      "snow",
      "cave",
    ]);
    expect(Object.keys(PROVISIONAL_THEME)).toHaveLength(5);
  });
  it("keeps the themes of the base pack", () => {
    expect(BASE_THEMES.map(lookOf)).toEqual(BASE_THEMES);
  });
});

describe("applyTheme", () => {
  const terrain = [1, 2, 3, 4, 21, 22, 23, 24, 121, 122, 123, 124, 69, 0];
  const decor = [125, 126, 127, 129, 86, 0];

  it("swaps the tiles, drops the decoration with no equivalent, keeps the spike", () => {
    const desert = applyTheme(terrain, decor, "desert");
    expect(desert.terrain).toEqual([41, 42, 43, 44, 61, 62, 63, 64, 121, 122, 123, 124, 69, 0]);
    expect(desert.decor).toEqual([128, 128, 0, 0, 86, 0]);
    expect(applyTheme(terrain, decor, "cave").terrain.slice(0, 8)).toEqual([
      141, 142, 143, 144, 121, 122, 123, 124,
    ]);
    expect(applyTheme(terrain, decor, "snow").decor).toEqual([0, 127, 127, 146, 86, 0]);
    expect(applyTheme(terrain, decor, "forest").decor).toEqual([129, 127, 127, 129, 86, 0]);
  });

  it("the meadow changes nothing and a borrowed look uses the other table", () => {
    expect(applyTheme(terrain, decor, "meadow")).toEqual({ terrain, decor });
    expect(applyTheme(terrain, decor, "factory")).toEqual(applyTheme(terrain, decor, "cave"));
  });

  it("never changes what is solid or a spike", () => {
    for (const theme of BASE_THEMES) {
      for (const gid of BASE_PALETTE) {
        const swapped = applyTheme([gid], [], theme, {
          [theme]: new Map([...(THEME_TILES[theme] ?? [])].map(([k, v]) => [k, v || gid])),
        }).terrain[0] as number;
        expect(isSpike(swapped)).toBe(isSpike(gid));
        expect(isSolid(swapped)).toBe(isSolid(gid));
      }
    }
  });

  it("has a table that covers the whole base palette in every theme", () => {
    for (const theme of BASE_THEMES) {
      expect([...(THEME_TILES[theme]?.keys() ?? [])].sort()).toEqual([...BASE_PALETTE].sort());
    }
  });

  it("fails for a theme with no table and no provisional one", () => {
    expect(() => applyTheme(terrain, decor, "snow", {})).toThrow(/no tile table/);
  });

  it("fails if terrain would leave the map", () => {
    const table = { meadow: new Map([[1, 0]]) };
    expect(() => applyTheme([1], [], "meadow", table)).toThrow(/terrain tile 1/);
  });
});
