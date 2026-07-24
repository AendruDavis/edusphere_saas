import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

const primaryRoutes = [
  "/",
  "/reports",
  "/fees",
  "/students",
  "/attendance",
  "/grades",
  "/timetable",
  "/settings",
];

async function authenticate(page: Page) {
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated responsive tests.");
  const response = await page.request.post("/api/auth/login", {
    data: { email, pass: password },
  });
  expect(response.ok(), `Authentication failed with HTTP ${response.status()}`).toBeTruthy();
  const session = await response.json();
  await page.addInitScript((tokens) => {
    localStorage.setItem("edu_postgres_access_token", tokens.accessToken);
    if (tokens.refreshToken) localStorage.setItem("edu_postgres_refresh_token", tokens.refreshToken);
  }, session);
}

async function expectNoDocumentOverflow(page: Page, context: string) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(
    dimensions.scrollWidth,
    `${context} has document-level horizontal overflow: ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px`,
  ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test("primary routes remain usable without document overflow", async ({ page }, testInfo) => {
  await authenticate(page);
  const missingResources = new Set<string>();
  const controlledInputWarnings: string[] = [];
  page.on("response", (response) => {
    if (response.status() === 404) missingResources.add(response.url());
  });
  page.on("console", (message) => {
    const text = message.text();
    if (/controlled.*uncontrolled|uncontrolled.*controlled/i.test(text)) controlledInputWarnings.push(text);
  });

  for (const route of primaryRoutes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page).not.toHaveURL(/\/login$/);
    await expectNoDocumentOverflow(page, `${testInfo.project.name} ${route}`);
  }

  expect([...missingResources], "Unexpected missing resources").toEqual([]);
  expect(controlledInputWarnings, "React controlled/uncontrolled input warnings").toEqual([]);
});

test("critical mobile workflows use task-focused views", async ({ page }, testInfo) => {
  test.skip((testInfo.project.use.viewport?.width || 0) >= 1024, "Mobile workflow assertion.");
  await authenticate(page);

  await page.goto("/grades", { waitUntil: "domcontentloaded" });
  await expect(page.locator("section[aria-label^='Marks for'], .app-empty-state").first()).toBeVisible();
  await expect(page.locator("table.min-w-\\[1180px\\]")).toBeHidden();
  await expectNoDocumentOverflow(page, `${testInfo.project.name} grades`);

  await page.goto("/timetable", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "Daily timetable" })).toBeVisible();
  await expect(page.getByLabel("Day")).toBeVisible();
  await expect(page.getByRole("region", { name: "Weekly timetable" })).toBeHidden();
  await expectNoDocumentOverflow(page, `${testInfo.project.name} timetable`);
});

test("mobile shell and dialogs are keyboard operable", async ({ page }, testInfo) => {
  test.skip((testInfo.project.use.viewport?.width || 0) >= 640, "Phone shell assertion.");
  await authenticate(page);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const menuButton = page.getByRole("button", { name: /open navigation/i });
  await menuButton.click();
  const drawer = page.locator('[role="dialog"][aria-label="Main navigation"]');
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveAttribute("aria-hidden", "true");
  await expect(menuButton).toBeFocused();

  await page.goto("/fees", { waitUntil: "domcontentloaded" });
  const paymentButton = page.getByRole("button", { name: /collect fees|record payment/i }).first();
  await paymentButton.click();
  const paymentDialog = page.getByRole("dialog");
  await expect(paymentDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(paymentDialog).toBeHidden();
  await expect(paymentButton).toBeFocused();
});

test("phone controls meet the minimum touch target height", async ({ page }, testInfo) => {
  test.skip((testInfo.project.use.viewport?.width || 0) >= 640, "Phone touch-target assertion.");
  await authenticate(page);
  await page.goto("/students", { waitUntil: "domcontentloaded" });

  const undersizedButtons = await page.locator("main button:visible").evaluateAll((buttons) =>
    buttons
      .map((button) => {
        const rect = button.getBoundingClientRect();
        return { label: button.getAttribute("aria-label") || button.textContent?.trim() || "unlabelled", height: rect.height };
      })
      .filter((button) => button.height > 0 && button.height < 43.5),
  );

  expect(undersizedButtons, `Undersized phone buttons: ${JSON.stringify(undersizedButtons)}`).toEqual([]);
});
