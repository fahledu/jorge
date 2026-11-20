// `?fase=N` opens level N in `pnpm dev` only (plan 1g, decision 3): imported under
// `import.meta.env.DEV`, so the production build does not carry it (scripts/check-dist.ts).
import { LEVEL_COUNT } from "../../domain/curve.ts";

/** Level of the `fase` parameter; 1 when it is missing or not a level number. */
export function levelFromUrl(search: string): number {
  const value = new URLSearchParams(search).get("fase");
  if (value === null || !/^\d{1,3}$/.test(value)) return 1;
  const level = Number(value);
  return level >= 1 && level <= LEVEL_COUNT ? level : 1;
}
