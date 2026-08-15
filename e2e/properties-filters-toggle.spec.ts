import { test, expect } from "@playwright/test"

const LOCALES = ["en", "ar"] as const

for (const locale of LOCALES) {
  test.describe(`Properties filters toggle (${locale})`, () => {
    test("filters toggle is visible in the top bar", async ({ page }) => {
      await page.goto(`/${locale}/properties`, { waitUntil: "domcontentloaded" })
      const toggle = page.getByTestId("properties-filters-toggle")
      await expect(toggle).toBeVisible()
      await expect(toggle).toHaveAttribute("aria-expanded", /true|false/)
      await expect(toggle).toHaveAttribute("aria-controls", "properties-filters-panel")
    })

    test("panel is open by default on desktop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto(`/${locale}/properties`, { waitUntil: "domcontentloaded" })
      const toggle = page.getByTestId("properties-filters-toggle")
      await expect(toggle).toHaveAttribute("aria-expanded", "true")
      const panel = page.locator("#properties-filters-panel")
      await expect(panel).toBeVisible()
    })

    test("panel is closed by default on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 414, height: 800 })
      await page.goto(`/${locale}/properties`, { waitUntil: "domcontentloaded" })
      const toggle = page.getByTestId("properties-filters-toggle")
      await expect(toggle).toHaveAttribute("aria-expanded", "false")
    })

    test("clicking the toggle hides and shows the filter panel", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto(`/${locale}/properties`, { waitUntil: "domcontentloaded" })
      const toggle = page.getByTestId("properties-filters-toggle")
      const panel = page.locator("#properties-filters-panel")

      await expect(toggle).toHaveAttribute("aria-expanded", "true")
      await expect(panel).toBeVisible()

      await toggle.click()
      await expect(toggle).toHaveAttribute("aria-expanded", "false")

      await toggle.click()
      await expect(toggle).toHaveAttribute("aria-expanded", "true")
      await expect(panel).toBeVisible()
    })

    test("closing the panel still shows the property cards", async ({ page }) => {
      await page.goto(`/${locale}/properties`, { waitUntil: "domcontentloaded" })
      const toggle = page.getByTestId("properties-filters-toggle")
      await toggle.click()
      const cards = page.locator("h3").first()
      await expect(cards).toBeVisible({ timeout: 10_000 })
    })
  })
}
