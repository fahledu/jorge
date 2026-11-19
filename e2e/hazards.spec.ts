import { expect, type Page, test } from "@playwright/test";
import { TILE_SIZE } from "../src/domain/tmj.ts";
import { watchProblems } from "./problems.ts";

// Level 1 (levels/manual/001.tmj): spikes at (51, 11) and (52, 11), a coin at (8, 10),
// the spring at (40, 11), the heart at (45, 6) on the platform of row 7.
const SPIKE = { col: 51, row: 11 } as const;

let problems: string[] = [];

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "keyboard only; touch arrives in item 1k");
  problems = await watchProblems(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Jogar" }).click();
  await page.waitForFunction(
    () => window.__jorgeTest?.state().status === "playing" && window.__jorgeTest.player()?.onGround,
  );
});

test.afterEach(() => {
  expect(problems).toEqual([]);
});

const state = (page: Page) => page.evaluate(() => window.__jorgeTest?.state());
const place = (page: Page, col: number, row: number) =>
  page.evaluate(([c, r]) => window.__jorgeTest?.placePlayer(c, r), [col, row] as const);

/** Waits `count` animation frames (a condition on the game loop, not a fixed time). */
async function frames(page: Page, count: number): Promise<void> {
  await page.evaluate(
    (n) =>
      new Promise<void>((resolve) => {
        let seen = 0;
        const tick = (): void => {
          seen += 1;
          if (seen >= n) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    count,
  );
}

async function hitSpike(page: Page): Promise<void> {
  await page.waitForFunction(() => !window.__jorgeTest?.state().invulnerable);
  await place(page, SPIKE.col, SPIKE.row);
}

test("a spike hurts and pushes away; a second touch while blinking does not", async ({ page }) => {
  await place(page, SPIKE.col, SPIKE.row);
  // Right on top of the spike and looking right: pushed to the left.
  await page.waitForFunction(() => (window.__jorgeTest?.player()?.vx ?? 0) < 0);
  expect(await state(page)).toMatchObject({ hearts: 2, invulnerable: true });

  await place(page, SPIKE.col, SPIKE.row);
  await frames(page, 5);
  expect(await state(page)).toMatchObject({ hearts: 2, invulnerable: true });

  // Still on the spike once the blinking ends: it hurts again (plan 1d, decision 2).
  await page.waitForFunction(() => window.__jorgeTest?.state().hearts === 1);
  expect((await state(page))?.attempt).toBe(1);
});

test("the player does not stand on a spike", async ({ page }) => {
  await page.evaluate(() => window.__jorgeTest?.placePlayer(51, 9));
  await page.waitForFunction(() => window.__jorgeTest?.player()?.onGround);
  // Down on the ground row below the spike, not on top of it.
  expect((await page.evaluate(() => window.__jorgeTest?.player()))?.bottom).toBe(12 * TILE_SIZE);
});

test("0 hearts turns into the angel, then restarts with everything back", async ({ page }) => {
  await place(page, 8, 10);
  await page.waitForFunction(() => window.__jorgeTest?.state().coins === 1);
  for (let hit = 0; hit < 3; hit += 1) await hitSpike(page);
  await page.waitForFunction(() => window.__jorgeTest?.state().status === "dying");
  expect((await state(page))?.attempt).toBe(1);
  await page.waitForFunction(
    () =>
      window.__jorgeTest?.state().attempt === 2 && window.__jorgeTest.state().status === "playing",
  );
  expect(await state(page)).toMatchObject({ hearts: 3, coins: 0, invulnerable: false });
});

test("falling out of the map also shows the angel before restarting", async ({ page }) => {
  await place(page, 15, 10);
  await page.waitForFunction(() => window.__jorgeTest?.state().status === "dying");
  await page.waitForFunction(() => window.__jorgeTest?.state().attempt === 2);
});

test("the pause freezes the invulnerability", async ({ page }) => {
  await place(page, SPIKE.col, SPIKE.row);
  await page.waitForFunction(() => window.__jorgeTest?.state().invulnerable);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Pausa" })).toBeVisible();
  // About 2 s of frames, longer than the 1.5 s of invulnerability.
  await frames(page, 120);
  await page.getByRole("button", { name: "Continuar" }).click();
  expect((await state(page))?.invulnerable).toBe(true);
});

test("a coin disappears and counts once", async ({ page }) => {
  await place(page, 8, 10);
  await page.waitForFunction(() => window.__jorgeTest?.state().coins === 1);
  await place(page, 8, 10);
  await frames(page, 5);
  expect((await state(page))?.coins).toBe(1);
});

test("a heart gives one back, up to 3", async ({ page }) => {
  await place(page, 45, 6);
  await frames(page, 5);
  expect((await state(page))?.hearts).toBe(3);

  await place(page, SPIKE.col, SPIKE.row);
  await page.waitForFunction(() => window.__jorgeTest?.state().hearts === 2);
  // The heart of this attempt was consumed at 3: the platform is empty now.
  await place(page, 45, 6);
  await frames(page, 5);
  expect((await state(page))?.hearts).toBe(2);
});

test("a heart picked with 2 hearts gives 3", async ({ page }) => {
  await place(page, SPIKE.col, SPIKE.row);
  await page.waitForFunction(() => window.__jorgeTest?.state().hearts === 2);
  await place(page, 45, 6);
  await page.waitForFunction(() => window.__jorgeTest?.state().hearts === 3);
});

test("the spring launches well above a jump, with no key held", async ({ page }) => {
  await place(page, 40, 11);
  const sample = await page.evaluate(
    () =>
      new Promise<{ minVy: number; risePx: number }>((resolve) => {
        const start = window.__jorgeTest?.player()?.bottom ?? 0;
        let minVy = 0;
        let top = start;
        let seen = 0;
        const tick = (): void => {
          const player = window.__jorgeTest?.player();
          if (player) {
            minVy = Math.min(minVy, player.vy);
            top = Math.min(top, player.bottom);
          }
          seen += 1;
          if (seen >= 90) resolve({ minVy, risePx: start - top });
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  expect(sample.minVy).toBeLessThanOrEqual(-450);
  expect(sample.risePx / TILE_SIZE).toBeGreaterThan(5);
});
