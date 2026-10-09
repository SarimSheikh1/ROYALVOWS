import { MongoMemoryReplSet } from "mongodb-memory-server";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { User, Venue, Package, Booking } from "../server/src/models.js";
const db = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
  binary: { version: "8.0.15" },
});
const uri = db.getUri("royalvows_browser_demo");
const password = randomBytes(18).toString("base64url");
const webPort = process.env.QA_WEB_PORT || "5175";
const origin = "http://127.0.0.1:" + webPort;
const children: any[] = [];
function launch(args: string[], env: any = {}, cwd = process.cwd()) {
  const c = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  c.stderr.on("data", (d) => process.stderr.write(d));
  children.push(c);
  return c;
}
let browser: any;
try {
  await mongoose.connect(uri);
  const venue = await Venue.create({
    name: "Imperial Grand Ballroom",
    city: "Demo City",
    capacity: 500,
    rental: 15000000,
    taxBps: 0,
    archived: false,
    description: "Illustrative palace for an extraordinary celebration.",
    amenities: ["Bridal suite", "Parking", "Accessible entry"],
    image: "/media/palace-aerial-concept.webp",
  });
  const pack = await Package.create({
    name: "Pearl",
    perHead: 250000,
    decor: 5000000,
    minGuests: 50,
    maxGuests: 500,
    inclusions: ["Signature dining", "Coordination"],
    archived: false,
  });
  const manager = await User.create({
    name: "QA Hall Manager",
    email: "manager@qa.test",
    password: await bcrypt.hash(password, 12),
    role: "Hall Manager",
    venues: [venue._id],
  });
  await User.create({
    name: "QA Administrator",
    email: "admin@qa.test",
    password: await bcrypt.hash(password, 12),
    role: "Super Admin",
  });
  await User.create({
    name: "QA Customer",
    email: "customer@qa.test",
    password: await bcrypt.hash(password, 12),
    role: "Customer",
  });
  launch(["--import", "tsx", "server/src/index.ts"], {
    MONGODB_URI: uri,
    SESSION_SECRET: randomBytes(48).toString("hex"),
    CLIENT_ORIGIN: origin,
    PORT: "4102",
    SMTP_HOST: "",
    CLOUDINARY_URL: "",
  });
  launch(
    [
      "../node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      webPort,
      "--strictPort",
    ],
    { API_PROXY_TARGET: "http://127.0.0.1:4102" },
    process.cwd() + "/client",
  );
  for (let i = 0; i < 150; i++) {
    try {
      if (
        (await fetch(origin)).ok &&
        (await fetch("http://127.0.0.1:4102/api/health")).ok
      )
        break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors: string[] = [];
  page.on("pageerror", (e: any) => errors.push(e.message));
  await mkdir("qa", { recursive: true });
  await page.goto(origin);
  await expect(
    page.getByRole("heading", { name: /Every love story/ }),
  ).toBeVisible();
  await page.screenshot({ path: "qa/home-desktop.png", fullPage: true });
  console.log("PASS desktop homepage and concept artwork");
  const profileRequests: string[] = [];
  const trackProfile = (request: any) => {
    if (new URL(request.url()).pathname === "/api/profile") profileRequests.push(request.url());
  };
  page.on("request", trackProfile);
  await page.goto(origin + "/palaces/" + venue._id);
  await expect(page.getByRole("heading", { name: venue.name, exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  expect(profileRequests).toHaveLength(0);
  page.off("request", trackProfile);
  console.log("PASS public venue pages do not request a private customer profile");
  await page.goto(origin + "/login");
  await page.getByLabel("Email", { exact: true }).fill("customer@qa.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, QA." }),
  ).toBeVisible();
  await page.goto(origin + "/planning");
  await page.getByRole("button", { name: "3. Details & estimate" }).click();
  await expect(page.getByRole("alert")).toHaveText("Choose a palace before continuing.");
  await page
    .getByLabel("Palace", { exact: true })
    .selectOption(String(venue._id));
  await page.getByLabel("Date", { exact: true }).fill("2027-02-20");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toHaveText("Choose a wedding collection before calculating your estimate.");
  await page.getByRole("button", { name: "3. Details & estimate" }).click();
  await expect(page.getByRole("alert")).toHaveText("Choose a wedding collection before calculating your estimate.");
  await page
    .getByLabel("Collection", { exact: true })
    .selectOption(String(pack._id));
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByRole("button", { name: "Calculate authoritative estimate" })
    .click();
  await expect(
    page.getByRole("button", { name: "Submit booking request" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Submit booking request" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, QA." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Imperial Grand Ballroom").first()).toBeVisible();
  console.log("PASS customer booking submission and persistence after refresh");
  await page.getByRole("button", { name: "Payments", exact: true }).click();
  await page.getByLabel("Booking", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Amount (PKR)", { exact: true }).fill("10000");
  await page
    .getByLabel("Method", { exact: true })
    .selectOption("Bank Transfer");
  await page
    .getByLabel("Transfer reference / evidence description")
    .fill("QA-transfer-reference");
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page.getByText("Pending", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto(origin + "/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@qa.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, QA." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Payments", exact: true }).click();
  await page.getByRole("button", { name: "Approve payment" }).click();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  console.log("PASS administrator manual payment approval");
  await page.getByRole("button", { name: "Bookings", exact: true }).click();
  await page.getByRole("button", { name: "Move to Awaiting Advance" }).click();
  await page.getByRole("button", { name: "Move to Confirmed" }).click();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await page.getByText("Refund / assign manager", { exact: true }).click();
  await page.getByLabel("Assigned manager").selectOption(String(manager._id));
  await page
    .getByRole("button", { name: "Assign manager", exact: true })
    .click();
  await expect
    .poll(async () => String((await Booking.findOne())?.manager))
    .toBe(String(manager._id));
  console.log("PASS booking confirmation and manager assignment");
  const invoice = page.getByRole("link", { name: "Download invoice" });
  const r = await page.request.get(
    origin + (await invoice.getAttribute("href")),
  );
  expect(r.status()).toBe(200);
  const invoiceBytes = await r.body();
  expect(invoiceBytes.subarray(0, 4).toString()).toBe("%PDF");
  await writeFile("qa/invoice.pdf", invoiceBytes);
  await page.screenshot({ path: "qa/admin-desktop.png", fullPage: true });
  console.log("PASS authorized invoice download");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto(origin + "/login");
  await page.getByLabel("Email", { exact: true }).fill("manager@qa.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Imperial Grand Ballroom").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download invoice" }),
  ).toHaveCount(0);
  console.log(
    "PASS scoped manager workspace with hidden and server-denied finances",
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(origin);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(
    page.getByRole("link", { name: "Our palaces", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Our palaces", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Our palaces", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "qa/palaces-mobile.png", fullPage: true });
  await page.goto(origin);
  await page.screenshot({ path: "qa/home-mobile.png", fullPage: true });
  console.log("PASS 360px navigation and overflow checks");
  expect(errors).toEqual([]);
  console.log("PASS no browser JavaScript exceptions");
} finally {
  await browser?.close();
  for (const c of children) c.kill();
  await mongoose.disconnect();
  await db.stop();
}
