import { describe, expect, it } from "vitest";
import { lookOf, PROVISIONAL_THEME, THEMES } from "../domain/theme.ts";
import { THEME_LOOKS, themeLook } from "./themes.ts";

describe("THEME_LOOKS", () => {
  it("has a look for every base-pack theme", () => {
    for (const theme of THEMES) {
      if (PROVISIONAL_THEME[theme] === undefined) expect(THEME_LOOKS[theme]).toBeDefined();
    }
  });

  it("resolves every expansion theme to the look of its provisional theme", () => {
    for (const theme of THEMES) {
      expect(themeLook(theme)).toBe(THEME_LOOKS[lookOf(theme)]);
    }
  });

  it("keeps each strip inside the 192 px sheet, on whole cells", () => {
    for (const look of Object.values(THEME_LOOKS)) {
      expect(look.strip.x % 24).toBe(0);
      expect(look.strip.x + look.strip.width).toBeLessThanOrEqual(192);
    }
  });
});
