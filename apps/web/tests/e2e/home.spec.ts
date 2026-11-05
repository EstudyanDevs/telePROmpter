import { expect, test } from "@playwright/test"

test("loads the application without browser errors", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")
  await expect(page).toHaveTitle("TelePROmpter")
  await expect(page.getByRole("heading", { name: "TelePROmpter", level: 1 })).toBeVisible()
  expect(errors).toEqual([])
})

test("compiled API responds to HTTP requests", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:4174/health")
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ status: "ok" })
})
