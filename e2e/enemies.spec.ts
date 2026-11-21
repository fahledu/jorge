import { expect, type Page, test } from "@playwright/test";
import { watchProblems } from "./problems.ts";

/** First column open to the bottom of the level (plan 1g, decision 6). */
async function firstPit(page: Page): Promise<number> {
  const pit = await page.evaluate(() => window.__jorgeTest?.level()?.pits[0]);
  if (pit === undefined) throw new Error("the level has no pit");
  return pit;
}
/** Patrol of the walker between walls in level 1: centre from 2204 to 2422 px (plan 1e). */
const WALL_WALKER = { id: 10, min: 2204, max: 2422 } as const;

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

/** The first live enemy of a type, with the patrol frozen so its cell holds still. */
async function frozenEnemy(page: Page, type: "walker" | "flyer") {
  await page.evaluate(() => window.__jorgeTest?.freezeEnemies(true));
  const enemy = await page.evaluate(
    (t) => window.__jorgeTest?.enemies().find((e) => e.type === t && !e.defeated),
    type,
  );
  if (!enemy) throw new Error(`level 1 has no live ${type}`);
  return enemy;
}

/** Drops the player 3 rows above the enemy; resolves with the lowest vy after the stomp. */
async function stomp(page: Page, enemy: { id: number; col: number; row: number }) {
  return page.evaluate(
    ([id, col, row]) =>
      new Promise<number>((resolve, reject) => {
        window.__jorgeTest?.placePlayer(col, row - 3);
        let after = -1;
        let minVy = 0;
        let seen = 0;
        const tick = (): void => {
          seen += 1;
          const defeated = window.__jorgeTest?.enemies().find((e) => e.id === id)?.defeated;
          if (defeated && after < 0) after = 0;
          if (after >= 0) {
            minVy = Math.min(minVy, window.__jorgeTest?.player()?.vy ?? 0);
            after += 1;
            if (after >= 10) {
              resolve(minVy);
              return;
            }
          }
          if (seen > 300) reject(new Error("the enemy was not defeated"));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    [enemy.id, enemy.col, enemy.row] as const,
  );
}

for (const type of ["walker", "flyer"] as const) {
  const counter = type === "walker" ? "defeatedWalkers" : "defeatedFlyers";

  test(`falling on a ${type} defeats it and bounces, with no damage`, async ({ page }) => {
    const enemy = await frozenEnemy(page, type);
    const minVy = await stomp(page, enemy);
    expect(minVy).toBeLessThan(0);
    expect(await state(page)).toMatchObject({ hearts: 3, [counter]: 1 });
  });

  test(`touching a ${type} hurts; not again while blinking`, async ({ page }) => {
    const enemy = await frozenEnemy(page, type);
    await place(page, enemy.col, enemy.row);
    await page.waitForFunction(() => window.__jorgeTest?.state().hearts === 2);
    expect(await state(page)).toMatchObject({ invulnerable: true, [counter]: 0 });
    await place(page, enemy.col, enemy.row);
    await frames(page, 5);
    expect((await state(page))?.hearts).toBe(2);
  });

  test(`a defeated ${type} stays gone until the level restarts`, async ({ page }) => {
    const enemy = await frozenEnemy(page, type);
    await stomp(page, enemy);
    await place(page, enemy.col, enemy.row);
    await frames(page, 10);
    expect((await state(page))?.hearts).toBe(3);

    await place(page, await firstPit(page), 10);
    await page.waitForFunction(
      () =>
        window.__jorgeTest?.state().attempt === 2 &&
        window.__jorgeTest.state().status === "playing",
    );
    expect(await state(page)).toMatchObject({ defeatedWalkers: 0, defeatedFlyers: 0 });
    const enemies = await page.evaluate(() => window.__jorgeTest?.enemies() ?? []);
    expect(enemies.length).toBe(3);
    expect(enemies.every((e) => !e.defeated)).toBe(true);
  });
}

test("with 1 heart, touching an enemy turns the player into the angel", async ({ page }) => {
  const enemy = await frozenEnemy(page, "walker");
  for (const hearts of [2, 1]) {
    await page.waitForFunction(() => !window.__jorgeTest?.state().invulnerable);
    await place(page, enemy.col, enemy.row);
    await page.waitForFunction((h) => window.__jorgeTest?.state().hearts === h, hearts);
  }
  await page.waitForFunction(() => !window.__jorgeTest?.state().invulnerable);
  await place(page, enemy.col, enemy.row);
  await page.waitForFunction(() => window.__jorgeTest?.state().status === "dying");
});

test("the walker turns at both ends and stays on its patrol", async ({ page }) => {
  const sample = await page.evaluate(
    (id) =>
      new Promise<{ min: number; max: number; left: boolean; right: boolean }>((resolve) => {
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        let last: number | null = null;
        let left = false;
        let right = false;
        const started = performance.now();
        const tick = (): void => {
          const x = window.__jorgeTest?.enemies().find((e) => e.id === id)?.x;
          if (x !== undefined) {
            min = Math.min(min, x);
            max = Math.max(max, x);
            if (last !== null && x < last) left = true;
            if (last !== null && x > last) right = true;
            last = x;
          }
          // About one way of the patrol and back (218 px at 40 px/s).
          if (performance.now() - started > 6000) resolve({ min, max, left, right });
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    WALL_WALKER.id,
  );
  expect(sample.min).toBeGreaterThanOrEqual(WALL_WALKER.min);
  expect(sample.max).toBeLessThanOrEqual(WALL_WALKER.max);
  expect(sample.left && sample.right).toBe(true);
});

test("the pause stops the enemies", async ({ page }) => {
  const walkerX = () =>
    page.evaluate(
      (id) => window.__jorgeTest?.enemies().find((e) => e.id === id)?.x,
      WALL_WALKER.id,
    );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Pausa" })).toBeVisible();
  const before = await walkerX();
  await frames(page, 60);
  expect(await walkerX()).toBe(before);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForFunction(
    ([id, x]) => window.__jorgeTest?.enemies().find((e) => e.id === id)?.x !== x,
    [WALL_WALKER.id, before ?? 0] as const,
  );
});

test.describe("enemies of plan 1g2", () => {
  // The first generated level with both new types, from 41 on (ADR 0014; plan 1g2), so a
  // new generator version or new chunks do not break the test.
  test.beforeEach(async ({ page }) => {
    const found = await page.evaluate(async () => {
      for (let n = 41; n <= 100; n++) {
        await window.__jorgeTest?.openLevel(n);
        const types = window.__jorgeTest?.level()?.enemies.map((e) => e.type) ?? [];
        if (types.includes("spiky") && types.includes("flyer-v")) return n;
      }
      return null;
    });
    if (found === null) throw new Error("no level has both a spiky and a vertical flyer");
    await page.waitForFunction(() => window.__jorgeTest?.player()?.onGround);
  });

  test("falling on a spiky hurts, with no stomp, and the spiky stays", async ({ page }) => {
    await page.evaluate(() => window.__jorgeTest?.freezeEnemies(true));
    const spiky = await page.evaluate(() =>
      window.__jorgeTest?.enemies().find((e) => e.type === "spiky"),
    );
    if (!spiky) throw new Error("the level has no spiky");
    await place(page, spiky.col, spiky.row - 3);
    await page.waitForFunction(() => window.__jorgeTest?.state().hearts === 2);
    const after = await page.evaluate(
      (id) => window.__jorgeTest?.enemies().find((e) => e.id === id),
      spiky.id,
    );
    expect(after?.defeated).toBe(false);
    expect(await state(page)).toMatchObject({ defeatedWalkers: 0, defeatedFlyers: 0 });
  });

  test("falling on a vertical flyer defeats it for 200 points", async ({ page }) => {
    await page.evaluate(() => window.__jorgeTest?.freezeEnemies(true));
    const flyer = await page.evaluate(() =>
      window.__jorgeTest?.enemies().find((e) => e.type === "flyer-v"),
    );
    if (!flyer) throw new Error("the level has no vertical flyer");
    const before = (await state(page))?.points ?? 0;
    await stomp(page, flyer);
    expect(await state(page)).toMatchObject({ hearts: 3, defeatedFlyers: 1 });
    expect((await state(page))?.points).toBe(before + 200);
  });
});
