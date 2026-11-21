// How each theme's background looks (ADR 0015; plan 1g2, decision 9): which strip of the
// background sheet, the flat sky color and an optional tint over the strip. Visual only:
// neither the domain nor the level build imports it, so no level file depends on it.
import { lookOf, type Theme } from "../domain/theme.ts";

export interface ThemeLook {
  /** Strip of `tilemap-backgrounds_packed.png`: left edge and width, px (2 cells of 24). */
  strip: { x: number; width: number };
  /** Flat sky, 0xRRGGBB; it also replaces the strip's own sky color behind the hills. */
  sky: number;
  /** Multiplied over the hills and the base of the strip, or none. */
  tint: number | null;
}

const STRIP = {
  paleTrees: { x: 0, width: 48 },
  palePines: { x: 48, width: 48 },
  orangePalms: { x: 96, width: 48 },
  greenTrees: { x: 144, width: 48 },
} as const;

/** Only the base-pack themes; the others borrow one through `lookOf` until item 1g3. */
export const THEME_LOOKS: Partial<Record<Theme, ThemeLook>> = {
  meadow: { strip: STRIP.greenTrees, sky: 0x9fd8ff, tint: null },
  forest: { strip: STRIP.greenTrees, sky: 0xa6cdb0, tint: 0x7aa07a },
  desert: { strip: STRIP.orangePalms, sky: 0xffe0aa, tint: null },
  cave: { strip: STRIP.paleTrees, sky: 0x2b2540, tint: 0x5a4f73 },
  snow: { strip: STRIP.palePines, sky: 0xe3f2ff, tint: null },
};

/** The look drawn for a level of `theme`; a theme with none is an error, never a default. */
export function themeLook(theme: Theme): ThemeLook {
  const look = THEME_LOOKS[lookOf(theme)];
  if (!look) throw new Error(`theme "${theme}" has no background look`);
  return look;
}
