// Numbers and times of the interface in pt-BR (ADR 0009); the HUD on the canvas has its own.
import { clockParts } from "../domain/hud.ts";

const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const twoDigits = new Intl.NumberFormat("pt-BR", { minimumIntegerDigits: 2 });
/** The decimal comma of pt-BR, read from Intl instead of written by hand. */
const DECIMAL =
  new Intl.NumberFormat("pt-BR").formatToParts(0.5).find((part) => part.type === "decimal")
    ?.value ?? ",";

export function formatPoints(points: number): string {
  return integer.format(points);
}

/** `m:ss,d` with the tenth truncated (plan 1f, decision 8): 42 850 ms → "0:42,8". */
export function formatTime(ms: number): string {
  const { minutes, seconds, tenths } = clockParts(ms);
  return `${integer.format(minutes)}:${twoDigits.format(seconds)}${DECIMAL}${tenths}`;
}

/** Whole seconds as `m:ss`: 32 → "0:32". */
export function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  return `${integer.format(minutes)}:${twoDigits.format(totalSeconds % 60)}`;
}
