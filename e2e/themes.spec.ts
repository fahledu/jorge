import { expect, test } from "@playwright/test";
import { watchProblems } from "./problems.ts";

// One theme per block of 10 levels (ADR 0015); the expansion blocks borrow the look of a
// base-pack theme until item 1g3 (plan 1g2, decision 8).
const EXPECTED: [level: number, theme: string, look: string][] = [
  [1, "meadow", "meadow"],
  [10, "meadow", "meadow"],
  [11, "forest", "forest"],
  [21, "farm", "meadow"],
  [31, "desert", "desert"],
  [41, "cave", "cave"],
  [51, "factory", "cave"],
  [61, "temple", "desert"],
  [71, "snow", "snow"],
  [81, "candy", "snow"],
  [91, "castle", "cave"],
  [100, "castle", "cave"],
];

let problems: string[] = [];

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the themes do not depend on the input");
  problems = await watchProblems(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Jogar" }).click();
  await page.waitForFunction(() => window.__jorgeTest?.state().status === "playing");
});

test.afterEach(() => {
  expect(problems).toEqual([]);
});

test("each block of 10 levels has its theme and look", async ({ page }) => {
  for (const [level, theme, look] of EXPECTED) {
    await page.evaluate((n) => window.__jorgeTest?.openLevel(n), level);
    const info = await page.evaluate(() => window.__jorgeTest?.level());
    expect({ level, theme: info?.theme, look: info?.look }).toEqual({ level, theme, look });
  }
});

test("opening level 31 after level 1 draws the desert, not the meadow", async ({ page }) => {
  await page.evaluate(() => window.__jorgeTest?.openLevel(31));
  expect(await page.evaluate(() => window.__jorgeTest?.level()?.look)).toBe("desert");
  expect(await page.evaluate(() => window.__jorgeTest?.state().status)).toBe("playing");
});
