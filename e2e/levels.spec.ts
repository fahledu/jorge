import { expect, test } from "@playwright/test";
import { watchProblems } from "./problems.ts";

// Every level opens and can be finished through the test shortcut (plan 1g): the files are
// in the build, the game reads them and the flag is where the level says.
test("opens and completes the 100 levels without errors", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one pass is enough; the levels are the same");
  test.setTimeout(240_000);
  const problems = await watchProblems(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Jogar" }).click();
  await page.waitForFunction(() => window.__jorgeTest?.state().status === "playing");

  for (let n = 1; n <= 100; n += 1) {
    await page.evaluate((level) => window.__jorgeTest?.openLevel(level), n);
    const opened = await page.evaluate(() => {
      const hooks = window.__jorgeTest;
      const level = hooks?.level();
      return { hud: hooks?.hud()?.level, width: level?.width };
    });
    expect(opened.hud, `level ${n}`).toBe(String(n));
    expect(opened.width, `level ${n}`).toBeGreaterThan(0);
    // Two columns before the flag: walking right touches it.
    await page.evaluate(() => window.__jorgeTest?.goToFlag());
    await page.keyboard.down("ArrowRight");
    await page.waitForFunction(() => window.__jorgeTest?.state().status === "completed");
    await page.keyboard.up("ArrowRight");
    const completed = await page.evaluate(() => window.__jorgeTest?.lastSummary()?.completion);
    expect(completed?.levelNumber, `level ${n}`).toBe(n);
  }
  expect(problems).toEqual([]);
});

test("opens level 1 whatever the address, outside pnpm dev", async ({ page }) => {
  await page.goto("/?fase=50");
  await page.getByRole("button", { name: "Jogar" }).click();
  await expect(page.getByRole("application", { name: "Fase 1" })).toBeVisible();
});
