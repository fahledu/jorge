import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import type { Cell } from "../src/domain/geometry.ts";
import { watchProblems } from "./problems.ts";

/** Column of the first gap of level 1 (levels/manual/001.tmj); level() has no terrain yet. */
const GAP_COL = 38;

let problems: string[] = [];
let COIN: Cell;
let SPIKE: Cell;

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "keyboard only; touch arrives in item 1k");
  problems = await watchProblems(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Jogar" }).click();
  await page.waitForFunction(
    () => window.__jorgeTest?.state().status === "playing" && window.__jorgeTest.player()?.onGround,
  );
  const level = await page.evaluate(() => window.__jorgeTest?.level());
  const coin = level?.items.find((item) => item.type === "coin");
  const spike = level?.spikes[0];
  if (!coin || !spike) throw new Error("level 1 has no coin or spike");
  COIN = coin;
  SPIKE = spike;
});

test.afterEach(() => {
  expect(problems).toEqual([]);
});

const state = (page: Page) => page.evaluate(() => window.__jorgeTest?.state());
const hud = (page: Page) => page.evaluate(() => window.__jorgeTest?.hud());
const place = (page: Page, cell: Cell) =>
  page.evaluate(([c, r]) => window.__jorgeTest?.placePlayer(c, r), [cell.col, cell.row] as const);

async function takeCoin(page: Page): Promise<void> {
  await place(page, COIN);
  await page.waitForFunction(() => window.__jorgeTest?.state().coins === 1);
}

/** Drops the player on the first walker, frozen, until it is defeated. */
async function stompWalker(page: Page): Promise<void> {
  await page.evaluate(() => window.__jorgeTest?.freezeEnemies(true));
  const walker = await page.evaluate(() =>
    window.__jorgeTest?.enemies().find((e) => e.type === "walker" && !e.defeated),
  );
  if (!walker) throw new Error("level 1 has no live walker");
  await place(page, { col: walker.col, row: walker.row - 3 });
  await page.waitForFunction(() => window.__jorgeTest?.state().defeatedWalkers === 1);
}

/** The page's clock, read before the action that restarts the level. */
const now = (page: Page) => page.evaluate(() => performance.now());

/**
 * Waits for attempt 2 and checks, in the page, that it starts from zero: no points, no
 * coins and a clock no longer than the real time since `since`. Not a fixed limit: under
 * load the game catches up several steps in one frame.
 */
const restarted = (page: Page, since: number) =>
  page.waitForFunction((start) => {
    const state = window.__jorgeTest?.state();
    if (state?.attempt !== 2 || state.status !== "playing") return false;
    if (state.points !== 0 || state.coins !== 0 || state.elapsedMs > performance.now() - start) {
      throw new Error(`attempt 2 did not start from zero: ${JSON.stringify(state)}`);
    }
    return true;
  }, since);

test("the HUD starts empty and goes up with a coin (+10) and a walker (+100)", async ({ page }) => {
  expect(await hud(page)).toMatchObject({
    hearts: 3,
    coins: "0",
    points: "000000",
    level: "1",
  });
  expect((await hud(page))?.clock).toMatch(/^0:0\d$/);
  await takeCoin(page);
  expect(await hud(page)).toMatchObject({ coins: "1", points: "000010" });
  await stompWalker(page);
  expect(await hud(page)).toMatchObject({ coins: "1", points: "000110" });
  expect((await state(page))?.points).toBe(110);
});

test("the pause shows level, time and points, and the clock does not run in it", async ({
  page,
}) => {
  await takeCoin(page);
  await page.keyboard.press("Escape");
  const dialog = page.getByRole("dialog", { name: "Pausa" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/^Fase 1 · \d+:\d\d,\d · 10 pontos$/)).toBeVisible();
  const paused = (await state(page))?.elapsedMs ?? 0;
  await page.waitForTimeout(1500); // the time that must not count
  expect((await state(page))?.elapsedMs).toBe(paused);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.waitForFunction((ms) => (window.__jorgeTest?.state().elapsedMs ?? 0) > ms, paused);
  const resumed = (await state(page))?.elapsedMs ?? 0;
  expect(resumed - paused).toBeLessThan(1000);
});

test("the summary adds up the attempt; 'play again' starts the HUD from zero", async ({ page }) => {
  await takeCoin(page);
  await stompWalker(page);
  await page.evaluate(() => window.__jorgeTest?.goToFlag());
  await page.keyboard.down("ArrowRight");
  const title = page.getByRole("heading", { name: "Fase 1 concluída!" });
  await expect(title).toBeVisible();
  await page.keyboard.up("ArrowRight");

  const summary = await page.evaluate(() => window.__jorgeTest?.lastSummary());
  if (!summary) throw new Error("no summary after the flag");
  expect(summary.walkers).toEqual({ count: 1, points: 100 });
  expect(summary.flyers).toEqual({ count: 0, points: 0 });
  expect(summary.coins).toEqual({ count: 1, points: 10 });
  expect(summary.completion.points).toBe(510);
  expect(summary.timeBonus.targetSeconds).toBe(45);

  const table = page.getByRole("table", { name: "Pontos da fase" });
  const rows = table.getByRole("row");
  await expect(rows).toHaveCount(6);
  const format = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
  const cells = await rows.evaluateAll((trs) =>
    trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent ?? "")),
  );
  expect(cells).toEqual([
    ["Andadores derrotados (1 × 100)", "100"],
    ["Voadores derrotados (0 × 200)", "0"],
    ["Moedas (1 × 10)", "10"],
    ["Fase concluída (500 + 10 × 1)", "510"],
    [
      expect.stringMatching(/^Bônus de tempo \(0:\d\d de 0:45\)$/),
      format(summary.timeBonus.points),
    ],
    ["Total", format(summary.total)],
  ]);
  expect(summary.total).toBe(100 + 0 + 10 + 510 + summary.timeBonus.points);

  const again = page.getByRole("button", { name: "Jogar de novo" });
  await expect(again).toBeFocused();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);

  const since = await now(page);
  await page.keyboard.press("Enter");
  await restarted(page, since);
  expect(await hud(page)).toMatchObject({ hearts: 3, coins: "0", points: "000000" });
});

test("falling shows 'Ops! Você caiu.' until the level restarts from zero", async ({ page }) => {
  await takeCoin(page);
  const since = await now(page);
  await place(page, { col: GAP_COL, row: 10 });
  const notice = page.getByRole("status");
  await expect(notice).toContainText("Ops! Você caiu.");
  await expect(notice).toContainText("Recomeçando a fase 1…");
  await expect(page.getByRole("button", { name: "Jogar de novo" })).toBeHidden();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);

  await restarted(page, since);
  await expect(notice).toHaveText("");
});

test("running out of hearts shows 'Ops! Acabaram os corações.'", async ({ page }) => {
  for (let hit = 0; hit < 3; hit += 1) {
    await page.waitForFunction(() => !window.__jorgeTest?.state().invulnerable);
    await place(page, SPIKE);
    await page.waitForFunction(
      (hearts) => (window.__jorgeTest?.state().hearts ?? 3) <= hearts,
      2 - hit,
    );
  }
  const since = await now(page);
  await expect(page.getByRole("status")).toContainText("Ops! Acabaram os corações.");
  await restarted(page, since);
  await expect(page.getByRole("status")).toHaveText("");
});
