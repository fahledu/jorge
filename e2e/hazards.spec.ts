import { expect, type Page, test } from "@playwright/test";
import type { Cell } from "../src/domain/geometry.ts";
import { TILE_SIZE } from "../src/domain/tmj.ts";
import { watchProblems } from "./problems.ts";

/** Column of the first gap of level 1 (levels/manual/001.tmj). */
const GAP_COL = 38;

let problems: string[] = [];
// Cells of level 1, read from the test hook (no fixed columns).
let SPIKE: Cell;
let COIN: Cell;
let HEART: Cell;
let SPRING: Cell;

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "keyboard only; touch arrives in item 1k");
  problems = await watchProblems(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Jogar" }).click();
  await page.waitForFunction(
    () => window.__jorgeTest?.state().status === "playing" && window.__jorgeTest.player()?.onGround,
  );
  const level = await page.evaluate(() => window.__jorgeTest?.level());
  if (!level) throw new Error("level cells not available");
  const item = (type: string): Cell => {
    const found = level.items.find((candidate) => candidate.type === type);
    if (!found) throw new Error(`level 1 has no ${type}`);
    return found;
  };
  const [spike] = level.spikes;
  if (!spike) throw new Error("level 1 has no spike");
  SPIKE = spike;
  COIN = item("coin");
  HEART = item("heart");
  SPRING = item("spring");
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
  // All in the page, frame by frame: round trips to the test runner may take longer than
  // the 1.5 s of invulnerability on a loaded machine.
  const result = await page.evaluate(
    ([col, row, size]) =>
      new Promise<{ pushedLeft: boolean; invulnerable: boolean; hearts: number[] }>((resolve) => {
        const hooks = window.__jorgeTest;
        hooks?.placePlayer(col, row);
        const centre = (col + 0.5) * size;
        let pushedLeft = false;
        let invulnerable = false;
        const hearts: number[] = [];
        const tick = (): void => {
          const state = hooks?.state();
          if (!pushedLeft) {
            // Right on top of the spike and looking right: pushed to the left. Checked by
            // where the player goes, not by vx: one slow frame may hold the whole push.
            if (state?.hearts === 2 && (hooks?.player()?.x ?? centre) < centre) {
              pushedLeft = true;
              invulnerable = state.invulnerable;
              // Back on the spike right after the hit: the next 5 frames stay at 2.
              hooks?.placePlayer(col, row);
            }
          } else {
            hearts.push(state?.hearts ?? -1);
            if (hearts.length >= 5) {
              resolve({ pushedLeft, invulnerable, hearts });
              return;
            }
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    [SPIKE.col, SPIKE.row, TILE_SIZE] as const,
  );
  expect(result).toEqual({ pushedLeft: true, invulnerable: true, hearts: [2, 2, 2, 2, 2] });

  // Still on the spike once the blinking ends: it hurts again (plan 1d, decision 2).
  await page.waitForFunction(() => window.__jorgeTest?.state().hearts === 1);
  expect((await state(page))?.attempt).toBe(1);
});

test("the player does not stand on a spike", async ({ page }) => {
  await place(page, SPIKE.col, SPIKE.row - 2);
  await page.waitForFunction(() => window.__jorgeTest?.player()?.onGround);
  // Down on the ground row below the spike, not on top of it.
  expect((await page.evaluate(() => window.__jorgeTest?.player()))?.bottom).toBe(12 * TILE_SIZE);
});

test("0 hearts turns into the angel, then restarts with everything back", async ({ page }) => {
  await place(page, COIN.col, COIN.row);
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
  await place(page, GAP_COL, 10);
  await page.waitForFunction(() => window.__jorgeTest?.state().status === "dying");
  await page.waitForFunction(() => window.__jorgeTest?.state().attempt === 2);
});

test("with reduce effects turned on while playing, no blinking", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await place(page, SPIKE.col, SPIKE.row);
  await page.waitForFunction(() => window.__jorgeTest?.state().invulnerable);
  const alphas = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const seen: number[] = [];
        const tick = (): void => {
          if (window.__jorgeTest?.state().invulnerable) {
            seen.push(window.__jorgeTest.player()?.alpha ?? -1);
            requestAnimationFrame(tick);
          } else resolve(seen);
        };
        requestAnimationFrame(tick);
      }),
  );
  expect(alphas.length).toBeGreaterThan(30);
  expect(new Set(alphas)).toEqual(new Set([0.5]));
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
  await place(page, COIN.col, COIN.row);
  await page.waitForFunction(() => window.__jorgeTest?.state().coins === 1);
  await place(page, COIN.col, COIN.row);
  await frames(page, 5);
  expect((await state(page))?.coins).toBe(1);
});

test("a heart gives one back, up to 3", async ({ page }) => {
  await place(page, HEART.col, HEART.row);
  await frames(page, 5);
  expect((await state(page))?.hearts).toBe(3);

  await place(page, SPIKE.col, SPIKE.row);
  await page.waitForFunction(() => window.__jorgeTest?.state().hearts === 2);
  // The heart of this attempt was consumed at 3: its cell is empty now.
  await place(page, HEART.col, HEART.row);
  await frames(page, 5);
  expect((await state(page))?.hearts).toBe(2);
});

test("a heart picked with 2 hearts gives 3", async ({ page }) => {
  await place(page, SPIKE.col, SPIKE.row);
  await page.waitForFunction(() => window.__jorgeTest?.state().hearts === 2);
  await place(page, HEART.col, HEART.row);
  await page.waitForFunction(() => window.__jorgeTest?.state().hearts === 3);
});

test("the spring launches well above a jump, with no key held", async ({ page }) => {
  await place(page, SPRING.col, SPRING.row);
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
