import { expect, test, type Page } from "@playwright/test"

// Every request must stay on the local dev server; anything else is aborted and fails the test.
let external: string[] = []
test.beforeEach(async ({ page }) => {
  external = []
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === "localhost") return route.continue()
    external.push(url.href)
    return route.abort()
  })
})
test.afterEach(() => expect(external).toEqual([]))

const mod = process.platform === "darwin" ? "Meta" : "Control"

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

test("clean URLs: direct load, nav and back/forward", async ({ page }) => {
  await page.goto("/customers")
  await expect(
    page.getByRole("link", { name: "Customers" }).first()
  ).toHaveAttribute("aria-current", "page")
  await page.getByRole("link", { name: "Settings" }).first().click()
  await expect(page).toHaveURL(/\/settings$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/customers$/)
})

test("command palette opens with mod+K and navigates by keyboard", async ({
  page,
}) => {
  await page.goto("/")
  await page.keyboard.press(`${mod}+k`)
  const input = page.getByRole("combobox", { name: "Search commands" })
  await expect(input).toBeFocused()
  await input.fill("sett")
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/settings$/)
  await expect(input).toBeHidden()
})

test("palette customer result opens a filtered table", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Search" }).click()
  const first = page
    .getByRole("option")
    .filter({ hasText: /Pro|Team|Free|Enterprise/ })
    .first()
  const name = (await first
    .locator("span.truncate")
    .first()
    .textContent())!.trim()
  await first.click()
  await expect(page).toHaveURL(/\/customers\?q=/)
  await expect(
    page.getByRole("searchbox", { name: "Search customers" })
  ).toHaveValue(name)
  await expect(page.getByRole("row").nth(1)).toContainText(name)
})

test("chart is inspectable with arrow keys", async ({ page }) => {
  await page.goto("/")
  const chart = page.getByRole("img", { name: /Daily revenue/ })
  await chart.focus()
  await page.keyboard.press("End")
  await expect(
    page.getByRole("status").filter({ hasText: "Nov 18" })
  ).toBeVisible()
  await page.keyboard.press("ArrowLeft")
  await expect(
    page.getByRole("status").filter({ hasText: "Nov 17" })
  ).toBeVisible()
})

test("chart scrubs with the pointer and labels the projection", async ({
  page,
}) => {
  await page.goto("/")
  await page.getByRole("switch", { name: "Forecast" }).click()
  const chart = page.getByRole("img", { name: /Daily revenue/ })
  const box = (await chart.boundingBox())!
  const tip = page.locator("[role=status]").filter({ hasText: /Recorded|Projected/ })
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2)
  await expect(tip).toContainText("Recorded")
  await expect(tip).toContainText(/Oct|Nov/)
  await page.mouse.move(box.x + box.width - 24, box.y + box.height / 2)
  await expect(tip).toContainText("Projected")
  const t = (await tip.boundingBox())!
  expect(t.x + t.width).toBeLessThanOrEqual(box.x + box.width + 1)
  await page.mouse.move(box.x + box.width / 2, box.y - 80)
  await expect(tip).toBeHidden()
})

test("range choice uses arrow keys and survives reload", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("radio", { name: "30d" }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("radio", { name: "90d" })).toBeChecked()
  await expect(page.getByText("Daily, last 90 days")).toBeVisible()
  await page.reload()
  await expect(page.getByRole("radio", { name: "90d" })).toBeChecked()
})

test("table: / focuses search, filters, sorts and keeps status filter", async ({
  page,
}) => {
  await page.goto("/customers")
  await page.keyboard.press("/")
  const search = page.getByRole("searchbox", { name: "Search customers" })
  await expect(search).toBeFocused()
  await search.fill("zzzz-no-match")
  await expect(
    page.getByText("No customers match these filters.")
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(search).toHaveValue("")

  await page.getByRole("radio", { name: "Churned" }).click()
  const statuses = page.locator("tbody [data-slot=badge]")
  await expect(statuses.first()).toHaveText("churned")
  await page.reload()
  await expect(page.getByRole("radio", { name: "Churned" })).toBeChecked()

  const mrr = page.getByRole("columnheader", { name: "MRR" })
  await expect(mrr).toHaveAttribute("aria-sort", "descending")
  await mrr.getByRole("button").click()
  await expect(mrr).toHaveAttribute("aria-sort", "ascending")
})

test("archive confirms, stays busy until done, and removes the row", async ({
  page,
}) => {
  await page.goto("/customers")
  const firstRow = page.locator("tbody tr").first()
  const name = (await firstRow
    .locator("td")
    .nth(1)
    .locator("span")
    .first()
    .textContent())!.trim()
  const trigger = firstRow.getByRole("button", { name: `Actions for ${name}` })
  await trigger.focus()
  await page.keyboard.press("Enter")
  await page.getByRole("menuitem", { name: "Archive" }).click()
  const dialog = page.getByRole("alertdialog", { name: `Archive ${name}?` })
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused()
  await dialog.getByRole("button", { name: "Archive" }).click()
  await expect(
    dialog.getByRole("button", { name: "Archiving…" })
  ).toBeDisabled()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(`Archived ${name}`)).toBeVisible()
  await expect(page.locator("tbody")).not.toContainText(name)
})

test("plan select and row selection use Base UI semantics", async ({
  page,
}) => {
  await page.goto("/customers")
  const plan = page.getByRole("combobox", { name: "Plan" })
  const value = plan.locator("[data-slot=select-value]")
  await expect(value).toHaveText("All plans")
  await plan.focus()
  await page.keyboard.press("Enter")
  await page.getByRole("option", { name: "Team" }).click()
  await expect(value).toHaveText("Team")
  await expect(plan).toBeFocused()
  await page.reload()
  await expect(value).toHaveText("Team")

  const all = page.getByRole("checkbox", { name: "Select all on this page" })
  const first = page.locator("tbody").getByRole("checkbox").first()
  await first.click()
  await expect(first).toHaveAttribute("aria-checked", "true")
  await expect(all).toHaveAttribute("aria-checked", "mixed")
  await all.click()
  await expect(all).toHaveAttribute("aria-checked", "true")
  await all.click()
  await expect(first).toHaveAttribute("aria-checked", "false")
})

test("settings: inline validation, server error, honest save", async ({
  page,
}) => {
  await page.goto("/settings")
  const email = page.getByLabel("Email")
  await email.fill("not-an-email")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(
    page.getByText("Enter an email like name@company.com.")
  ).toBeVisible()
  await expect(email).toHaveAttribute("aria-invalid", "true")

  await email.fill("someone@fail.test")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled()
  await expect(
    page.getByText("The server rejected this email address.")
  ).toBeVisible()

  await email.fill("someone@example.com")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Profile saved")).toBeVisible()
  await page.reload()
  await expect(page.getByLabel("Email")).toHaveValue("someone@example.com")
})

test("density preference changes table row height", async ({ page }) => {
  await page.goto("/settings")
  await page.getByRole("radio", { name: "Compact" }).click()
  await page.getByRole("link", { name: "Customers" }).first().click()
  const height = await page
    .locator("tbody tr")
    .first()
    .evaluate((el) => el.getBoundingClientRect().height)
  expect(height).toBeLessThanOrEqual(45)
})

test("shortcut help lists registered shortcuts", async ({ page }) => {
  await page.goto("/customers")
  await page.keyboard.press("?")
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" })
  await expect(dialog).toContainText("Search customers")
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()

  const button = page.getByRole("button", { name: "Keyboard shortcuts" })
  await button.click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(button).toBeFocused()
})

for (const path of ["/", "/customers", "/settings"]) {
  test(`390px has no horizontal scroll on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(path)
    await page.waitForTimeout(300)
    await noHorizontalScroll(page)
  })
}

test("reduced motion disables transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  const duration = await page
    .locator("[data-slot=segmented-control-indicator]")
    .first()
    .evaluate((el) => getComputedStyle(el).transitionDuration)
  expect(duration).toBe("0s")
})
