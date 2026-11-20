import { expect, type Page, test } from "@playwright/test";
import { watchProblems } from "./problems.ts";

const LEVEL_CHUNK = /\/assets\/001-[\w-]+\.js$/;

async function play(page: Page, touch: boolean): Promise<void> {
  const button = page.getByRole("button", { name: "Jogar" });
  if (touch) await button.tap();
  else await button.click();
}

test("downloads level 1 only on Play and shows it labelled, without errors", async ({
  page,
}, testInfo) => {
  const problems = await watchProblems(page);
  const levelRequests: string[] = [];
  page.on("request", (request) => {
    if (LEVEL_CHUNK.test(new URL(request.url()).pathname)) levelRequests.push(request.url());
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Jogar" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(levelRequests).toEqual([]);

  await play(page, testInfo.project.use.hasTouch === true);
  const canvas = page.getByRole("application", { name: "Fase 1" });
  await expect(canvas).toBeVisible();
  // Focused while playing, so a screen reader in browse mode lets the keys through.
  await expect(canvas).toBeFocused();
  expect(levelRequests).toHaveLength(1);

  // Let the camera move for a moment, then look for runtime errors.
  await page.waitForTimeout(500);
  expect(problems).toEqual([]);
});

test("level 1 fills 1920×1080 at scale 4", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "viewport fixed by the phone profile");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await play(page, false);
  const canvas = page.getByRole("application", { name: "Fase 1" });
  await expect(canvas).toHaveCSS("width", "1920px");
  await expect(canvas).toHaveCSS("height", "1080px");
});

test("level 1 fits 693×390 in an 844×390 phone", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-landscape", "phone profile only");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await play(page, true);
  const canvas = page.getByRole("application", { name: "Fase 1" });
  await expect(canvas).toHaveCSS("width", "693px");
  await expect(canvas).toHaveCSS("height", "390px");
  await expect(canvas).toHaveCSS("image-rendering", "pixelated");
});
