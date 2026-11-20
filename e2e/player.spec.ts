import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { jumpReach } from "../src/domain/physics.ts";
import { TILE_SIZE } from "../src/domain/tmj.ts";
import { watchProblems } from "./problems.ts";

/** How far the engine may be from the domain's jump model, in tiles (plan 1c). */
const MODEL_TOLERANCE = 0.25;

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "keyboard only; touch arrives in item 1k");
  await page.goto("/");
  await page.getByRole("button", { name: "Jogar" }).click();
  await page.waitForFunction(
    () => window.__jorgeTest?.state().status === "playing" && window.__jorgeTest.player()?.onGround,
  );
});

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

interface JumpSample {
  risePx: number;
  distancePx: number;
}

/** Samples the player every frame from now until it takes off and lands again. */
function sampleJump(page: Page): Promise<JumpSample> {
  return page.evaluate(
    () =>
      new Promise<JumpSample>((resolve) => {
        const hooks = window.__jorgeTest;
        const first = hooks?.player();
        if (!hooks || !first) throw new Error("no player");
        let lowestBottom = first.bottom;
        let takeoffX: number | null = null;
        let lastGroundX = first.x;
        const tick = (): void => {
          const player = hooks.player();
          if (!player) throw new Error("player gone");
          lowestBottom = Math.min(lowestBottom, player.bottom);
          if (takeoffX === null) {
            if (player.onGround) lastGroundX = player.x;
            else takeoffX = lastGroundX;
          } else if (player.onGround) {
            resolve({ risePx: first.bottom - lowestBottom, distancePx: player.x - takeoffX });
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}

async function state(page: Page) {
  return page.evaluate(() => window.__jorgeTest?.state());
}

test("held running jump reaches the domain's model (at least 4 tiles up and across)", async ({
  page,
}) => {
  const problems = await watchProblems(page);
  const model = jumpReach();
  const jump = sampleJump(page);
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("Space");
  const { risePx, distancePx } = await jump;
  await page.keyboard.up("Space");
  await page.keyboard.up("ArrowRight");

  const rise = risePx / TILE_SIZE;
  const distance = distancePx / TILE_SIZE;
  expect(rise).toBeGreaterThanOrEqual(4);
  expect(distance).toBeGreaterThanOrEqual(4);
  expect(Math.abs(rise - model.heightTiles)).toBeLessThanOrEqual(MODEL_TOLERANCE);
  expect(Math.abs(distance - model.gapTiles)).toBeLessThanOrEqual(MODEL_TOLERANCE);
  expect(problems).toEqual([]);
});

test("a tapped jump stays under 2 tiles", async ({ page }) => {
  const jump = sampleJump(page);
  await page.keyboard.press("Space");
  const { risePx } = await jump;
  expect(risePx / TILE_SIZE).toBeLessThan(2);
  expect(risePx).toBeGreaterThan(0);
});

test("falling out of the map restarts the level at the start", async ({ page }) => {
  const start = await page.evaluate(() => window.__jorgeTest?.player());
  await page.evaluate(() => {
    const pit = window.__jorgeTest?.level()?.pits[0];
    if (pit !== undefined) window.__jorgeTest?.placePlayer(pit, 10);
  });
  await page.waitForFunction(() => window.__jorgeTest?.state().attempt === 2);
  await page.waitForFunction(() => window.__jorgeTest?.state().status === "playing");
  const player = await page.evaluate(() => window.__jorgeTest?.player());
  expect(player?.x).toBe(start?.x);
  expect(player?.vx).toBe(0);
});

test("touching the flag completes the level and 'play again' restarts it", async ({ page }) => {
  const problems = await watchProblems(page);
  await page.evaluate(() => window.__jorgeTest?.goToFlag());
  await page.keyboard.down("ArrowRight");
  const title = page.getByRole("heading", { name: "Fase 1 concluída!" });
  await expect(title).toBeVisible();
  await page.keyboard.up("ArrowRight");
  const again = page.getByRole("button", { name: "Jogar de novo" });
  await expect(again).toBeFocused();
  expect((await state(page))?.status).toBe("completed");
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);

  await page.keyboard.press("Enter");
  await expect(title).toBeHidden();
  await page.waitForFunction(() => window.__jorgeTest?.state().status === "playing");
  expect((await state(page))?.attempt).toBe(2);
  expect(problems).toEqual([]);
});

test("Esc pauses and resumes without pausing again; P and the button do too", async ({ page }) => {
  const dialog = page.getByRole("dialog", { name: "Pausa" });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar" })).toBeFocused();
  await expect(dialog.getByText("Fase 1")).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);

  const before = await page.evaluate(() => window.__jorgeTest?.player());
  await frames(page, 10);
  expect(await page.evaluate(() => window.__jorgeTest?.player())).toEqual(before);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("application", { name: "Fase 1" })).toBeFocused();
  await frames(page, 10);
  expect((await state(page))?.status).toBe("playing");
  await expect(dialog).toBeHidden();

  await page.keyboard.press("KeyP");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("KeyP");
  await expect(dialog).toBeHidden();

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(dialog).toBeHidden();
  await frames(page, 10);
  expect((await state(page))?.status).toBe("playing");
});

test("losing focus pauses and lets go of held keys", async ({ page }) => {
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => (window.__jorgeTest?.player()?.vx ?? 0) > 0);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const dialog = page.getByRole("dialog", { name: "Pausa" });
  await expect(dialog).toBeVisible();
  await page.keyboard.up("ArrowRight");
  await page.getByRole("button", { name: "Continuar" }).click();
  await frames(page, 5);
  expect((await page.evaluate(() => window.__jorgeTest?.player()))?.vx).toBe(0);
});

test("restarting three times still opens a single pause", async ({ page }) => {
  for (let attempt = 2; attempt <= 4; attempt += 1) {
    await page.evaluate(() => window.__jorgeTest?.goToFlag());
    await page.keyboard.down("ArrowRight");
    await expect(page.getByRole("button", { name: "Jogar de novo" })).toBeFocused();
    await page.keyboard.up("ArrowRight");
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      (n) =>
        window.__jorgeTest?.state().attempt === n &&
        window.__jorgeTest.state().status === "playing",
      attempt,
    );
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Pausa" })).toHaveCount(1);
  await page.keyboard.press("Escape");
  await frames(page, 10);
  expect((await state(page))?.status).toBe("playing");
});
