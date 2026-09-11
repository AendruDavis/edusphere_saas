import { test as base, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import net, { type AddressInfo } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { openTestHarness, type TestHarness } from "../../server/testing/harness";
import { seedConfigurationFixtures, type ConfigurationFixtures } from "../../server/testing/fixtures";

type RunningSchool = { harness: TestHarness; baseURL: string };
type SchoolFixture = ConfigurationFixtures & { baseURL: string; headers: Record<string, string> };

export const test = base.extend<{ school: SchoolFixture; browserErrors: string[] }, { runningSchool: RunningSchool }>({
  runningSchool: [async ({}, use) => {
    await fs.access("build/server.cjs").catch(() => { throw new Error("Run npm run build before test:smoke; the suite tests the built server"); });
    const harness = await openTestHarness();
    let child: ReturnType<typeof spawn> | undefined;
    try {
      await harness.migrate();
      const listener = net.createServer().listen(0, "127.0.0.1");
      await once(listener, "listening");
      const port = (listener.address() as AddressInfo).port;
      await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
      const baseURL = `http://127.0.0.1:${port}`;
      child = spawn(process.execPath, ["build/server.cjs"], {
        env: { ...harness.env, PORT: String(port), NODE_ENV: "production" },
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let startupError: Error | undefined;
      child.on("error", error => { startupError = error; });
      child.stdout?.resume();
      child.stderr?.on("data", data => process.stderr.write(data));
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        if (startupError) throw startupError;
        if (child.exitCode !== null) throw new Error(`Built server exited with code ${child.exitCode}`);
        try { ready = (await fetch(`${baseURL}/api/health`, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* Await startup. */ }
        if (ready) break;
        await delay(250);
      }
      if (!ready) throw new Error("Isolated built server did not become healthy within 15 seconds");
      await use({ harness, baseURL });
    } finally {
      if (child && child.exitCode === null && child.pid) {
        const stopped = once(child, "exit");
        child.kill();
        await stopped;
      }
      await harness.close();
    }
  }, { scope: "worker", timeout: 40_000 }],
  school: async ({ runningSchool, page }, use) => {
    const records = await seedConfigurationFixtures(runningSchool.harness.client);
    const response = await page.request.post(`${runningSchool.baseURL}/api/auth/login`, {
      data: { email: records.admin.email, pass: records.admin.password },
    });
    expect(response.status()).toBe(200);
    const session = await response.json();
    await page.addInitScript(({ token, schoolId }) => {
      localStorage.setItem("edu_postgres_access_token", token);
      localStorage.setItem("edu_postgres_refresh_token", token);
      localStorage.setItem("edu_active_school_id", schoolId);
    }, { token: session.accessToken, schoolId: records.schoolId });
    await use({ ...records, baseURL: runningSchool.baseURL, headers: { Authorization: `Bearer ${session.accessToken}`, "X-School-Id": records.schoolId } });
  },
  browserErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await use(errors);
    expect(errors, "Browser errors").toEqual([]);
  }, { auto: true }],
});

test.afterEach(async ({ page }, info) => {
  await page.screenshot({ path: info.outputPath("screen.png"), mask: [page.locator('input[type="password"], input[aria-label="Temporary password"]')] });
});

export { expect };

export async function section(page: Page, name: string) {
  await expect(page.getByRole("heading", { name: "System settings", exact: true })).toBeVisible();
  const selector = page.getByLabel("Settings section").and(page.locator("select"));
  if (await selector.isVisible()) await selector.selectOption({ label: name });
  else await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name, exact: true }).click();
}

export async function assertFits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible()) {
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
}
