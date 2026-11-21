import { describe, expect, it } from "vitest";
import { levelFromUrl, secretFromUrl } from "./level-from-url.ts";

describe("levelFromUrl", () => {
  it("reads the level of ?fase", () => {
    expect(levelFromUrl("?fase=50")).toBe(50);
    expect(levelFromUrl("?x=1&fase=100")).toBe(100);
  });

  it.each(["", "?fase=0", "?fase=101", "?fase=abc", "?fase=5.5", "?fase=-3", "?fase="])(
    "opens level 1 for %j",
    (search) => {
      expect(levelFromUrl(search)).toBe(1);
    },
  );
});

describe("secretFromUrl", () => {
  it("is on only for ?segredo=1", () => {
    expect(secretFromUrl("?fase=41&segredo=1")).toBe(true);
    for (const search of ["", "?segredo=0", "?segredo=true", "?segredo="]) {
      expect(secretFromUrl(search)).toBe(false);
    }
  });
});
