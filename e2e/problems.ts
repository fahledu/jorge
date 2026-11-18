import type { Page } from "@playwright/test";

/** Collects console errors, page errors and CSP violations (the console does not always show them). */
export async function watchProblems(page: Page): Promise<string[]> {
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
