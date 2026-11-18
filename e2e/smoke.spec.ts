import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Collects CSP violations from the page itself (the console does not always show them).
async function watchProblems(page: Page): Promise<string[]> {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  await page.exposeFunction("__reportCsp", (text: string) => problems.push(`csp: ${text}`));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      const report = (window as unknown as { __reportCsp: (t: string) => void }).__reportCsp;
      report(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  return problems;
}

test("title opens, passes axe and starts the scene without errors or CSP violations", async ({
  page,
}, testInfo) => {
  const problems = await watchProblems(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Jorge" })).toBeVisible();
  const play = page.getByRole("button", { name: "Jogar" });
  await expect(play).toBeFocused();

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);

  if (testInfo.project.use.hasTouch) await play.tap();
  else await page.keyboard.press("Enter");

  await expect(play).toBeHidden();
  const canvas = page.getByRole("img", { name: "Jorge" });
  await expect(canvas).toBeVisible();
  expect(problems).toEqual([]);
});

test("scales the canvas by whole numbers at 1280×720", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "viewport fixed by the phone profile");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Jogar" }).click();

  const canvas = page.getByRole("img", { name: "Jorge" });
  await expect(canvas).toHaveCSS("width", "960px");
  await expect(canvas).toHaveCSS("height", "540px");
  await expect(canvas).toHaveCSS("image-rendering", "pixelated");

  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(canvas).toHaveCSS("width", "1920px");
});
