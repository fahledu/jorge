// `?fase=N` opens level N and `?segredo=1` shows the secret item, in `pnpm dev` only (plans 1g,
// decision 3, and 1g2, decision 4): imported under
// `import.meta.env.DEV`, so the production build does not carry it (scripts/check-dist.ts).
import { LEVEL_COUNT } from "../../domain/curve.ts";

/** Level of the `fase` parameter; 1 when it is missing or not a level number. */
export function levelFromUrl(search: string): number {
  const value = new URLSearchParams(search).get("fase");
  if (value === null || !/^\d{1,3}$/.test(value)) return 1;
  const level = Number(value);
  return level >= 1 && level <= LEVEL_COUNT ? level : 1;
}

/** `?segredo=1`: draw the secret item of the level (plan 1g2, decision 4). */
export function secretFromUrl(search: string): boolean {
  return new URLSearchParams(search).get("segredo") === "1";
}
