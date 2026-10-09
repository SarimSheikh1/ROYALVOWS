import { MongoMemoryReplSet } from "mongodb-memory-server";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import {
  User,
  Service,
  Booking,
  Venue,
  Package,
  Payment,
  Ledger,
  Reservation,
} from "../server/src/models.js";
const db = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
  binary: { version: "8.0.15" },
});
const uri = db.getUri("royalvows_test");
const port = 4101;
const child = spawn(
  process.execPath,
  ["--import", "tsx", "server/src/index.ts"],
  {
    env: {
      ...process.env,
      MONGODB_URI: uri,
      SESSION_SECRET: "test-secret-for-integration-at-least-32-chars",
      CLIENT_ORIGIN: "http://localhost:5173",
      PORT: String(port),
      SMTP_HOST: "",
      CLOUDINARY_URL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
child.stderr.on("data", (d) => process.stderr.write(d));
let checks = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  checks++;
  console.log("PASS " + name);
}
async function request(
  path: string,
  method = "GET",
  body?: any,
  session?: any,
) {
  const response = await fetch("http://127.0.0.1:" + port + "/api" + path, {
    method,
    headers: {
      Origin: "http://localhost:5173",
      "Content-Type": "application/json",
      ...(session
        ? { Cookie: session.cookie, "X-CSRF-Token": session.csrf }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response;
}
async function account(email: string) {
  const r = await request("/auth/register", "POST", {
    name: "Integration User",
    email,
    password: "test-password-123456",
  });
  assert.equal(r.status, 200);
  const data = (await r.json()).data;
  return {
    cookie: r.headers.get("set-cookie")!.split(";")[0],
    csrf: data.csrf,
    id: data.user._id,
  };
}
try {
  await mongoose.connect(uri);
  let ready = false;
  for (let i = 0; i < 600; i++) {
    try {
      if ((await request("/health")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready, "Integration API did not become ready within 60 seconds");
  const a = await account("one@example.test"),
    b = await account("two@example.test");
  const venue = await Venue.create({
    name: "Integration Palace",
    city: "Test",
    capacity: 200,
    rental: 10000000,
    taxBps: 0,
    archived: false,
  });
  const pack = await Package.create({
    name: "Integration Pearl",
    perHead: 200000,
    decor: 1000000,
    minGuests: 50,
    maxGuests: 200,
    archived: false,
  });
  const body = {
    venue: String(venue._id),
    package: String(pack._id),
    date: "2027-01-10",
    slot: "Evening",
    event: "Walima",
    guests: 100,
    theme: "Ivory Elegance",
    notes: "",
  };
  await check("complimentary package services are automatically included without charges or duplicates", async () => {
    const sound = await Service.create({ name: "Test free sound", rate: 3500000, unit: "event", includedWithPackage: true, archived: false });
    await Service.create({ name: "Test 10-minute dance", rate: 0, unit: "event", includedWithPackage: true, archived: false });
    const lighting = await Service.create({ name: "Test paid lighting", rate: 8500, unit: "event", archived: false });
    const quote = await (await request("/estimate", "POST", body)).json();
    assert.equal(quote.data.addons, 0);
    assert.equal(quote.data.addonItems.length, 2);
    assert.ok(quote.data.addonItems.every((item: any) => item.rate === 0 && item.includedWithPackage));
    const selected = await (await request("/estimate", "POST", { ...body, addons: [String(sound._id), String(lighting._id)] })).json();
    assert.equal(selected.data.addons, 8500);
    assert.equal(selected.data.addonItems.length, 3);
    assert.equal((await request("/estimate", "POST", { ...body, addons: [String(sound._id), String(sound._id)] })).status, 400);
  });
  let booking = "";
  await check(
    "concurrent bookings acquire exactly one atomic slot",
    async () => {
      const rr = await Promise.all([
        request("/bookings", "POST", body, a),
        request("/bookings", "POST", body, b),
      ]);
      assert.deepEqual(rr.map((r) => r.status).sort(), [201, 409]);
      const winner = rr.findIndex((r) => r.status === 201);
      booking = (await rr[winner].json()).data._id;
      if (winner === 1) {
        const t = { ...a };
        Object.assign(a, b);
        Object.assign(b, t);
      }
      assert.equal(await Reservation.countDocuments(), 1);
    },
  );
  await check("cross-user invoice and plan access denied", async () => {
    assert.equal(
      (await request("/bookings/" + booking + "/invoice", "GET", undefined, b))
        .status,
      404,
    );
    assert.equal(
      (
        await request(
          "/bookings/" + booking + "/plan",
          "PATCH",
          { checklist: [], guestList: [], timeline: [], notes: "" },
          b,
        )
      ).status,
      404,
    );
  });
  await check("tampered signed session cookie is rejected", async () => {
    const tampered = { ...a, cookie: a.cookie + "tampered" };
    assert.equal(
      (await request("/bookings", "GET", undefined, tampered)).status,
      401,
    );
  });
  await check("CSRF rejects authenticated mutation", async () => {
    assert.equal(
      (
        await request(
          "/bookings/" + booking + "/status",
          "PATCH",
          { status: "Cancelled" },
          { ...a, csrf: "bad" },
        )
      ).status,
      403,
    );
  });
  await check("customer cannot create admin through registration", async () => {
    const c = await request("/auth/register", "POST", {
      name: "Role Test",
      email: "role@example.test",
      password: "test-password-123456",
      role: "Super Admin",
    });
    assert.equal((await c.json()).data.user.role, "Customer");
  });
  await User.create({
    name: "Test Administrator",
    email: "admin@example.test",
    password: await bcrypt.hash("test-password-123456", 12),
    role: "Super Admin",
  });
  const ar = await request("/auth/login", "POST", {
    email: "admin@example.test",
    password: "test-password-123456",
  });
  const aj = await ar.json();
  const admin = {
    cookie: ar.headers.get("set-cookie")!.split(";")[0],
    csrf: aj.data.csrf,
    id: aj.data.user._id,
  };
  const paymentBody = {
    amount: 1000000,
    method: "Bank Transfer",
    reference: "TEST-reference",
    key: crypto.randomUUID(),
  };
  let payment = "";
  await check("manual payment report retry preserves one record", async () => {
    const r = await request(
      "/bookings/" + booking + "/payments",
      "POST",
      paymentBody,
      a,
    );
    assert.equal(r.status, 201);
    payment = (await r.json()).data._id;
    assert.equal(
      (
        await request(
          "/bookings/" + booking + "/payments",
          "POST",
          paymentBody,
          a,
        )
      ).status,
      200,
    );
    assert.equal(await Payment.countDocuments(), 1);
  });
  await check("customer cannot approve a payment", async () =>
    assert.equal(
      (await request("/payments/" + payment + "/approve", "POST", {}, a))
        .status,
      403,
    ),
  );
  await check(
    "concurrent approval records one immutable ledger entry",
    async () => {
      const rr = await Promise.all([
        request("/payments/" + payment + "/approve", "POST", {}, admin),
        request("/payments/" + payment + "/approve", "POST", {}, admin),
      ]);
      assert.ok(rr.every((r) => r.status === 200));
      assert.equal(await Ledger.countDocuments(), 1);
    },
  );
  const refund = {
    amount: 200000,
    reference: "TEST-refund",
    key: crypto.randomUUID(),
  };
  await check("refund retry does not double-debit ledger", async () => {
    assert.equal(
      (await request("/bookings/" + booking + "/refund", "POST", refund, admin))
        .status,
      200,
    );
    assert.equal(
      (await request("/bookings/" + booking + "/refund", "POST", refund, admin))
        .status,
      200,
    );
    const totals = await Ledger.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    assert.equal(totals[0].total, 800000);
  });
  await check("PDF invoice is authorized and valid PDF bytes", async () => {
    const r = await request(
      "/bookings/" + booking + "/invoice",
      "GET",
      undefined,
      a,
    );
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("content-type"), "application/pdf");
    assert.equal(
      Buffer.from(await r.arrayBuffer())
        .subarray(0, 4)
        .toString(),
      "%PDF",
    );
  });
  await check("unassigned hall manager cannot read another venue", async () => {
    await User.create({
      name: "Other Manager",
      email: "manager@example.test",
      password: await bcrypt.hash("test-password-123456", 12),
      role: "Hall Manager",
      venues: [],
    });
    const r = await request("/auth/login", "POST", {
      email: "manager@example.test",
      password: "test-password-123456",
    });
    const j = await r.json();
    const manager = {
      cookie: r.headers.get("set-cookie")!.split(";")[0],
      csrf: j.data.csrf,
    };
    assert.deepEqual(
      (await (await request("/bookings", "GET", undefined, manager)).json())
        .data,
      [],
    );
    assert.equal(
      (
        await request(
          "/bookings/" + booking + "/invoice",
          "GET",
          undefined,
          manager,
        )
      ).status,
      404,
    );
  });
  await check(
    "concurrent stock deductions prohibit negative inventory",
    async () => {
      const r = await request(
        "/admin/inventory",
        "POST",
        {
          name: "QA Chairs",
          threshold: 3,
          venue: String(venue._id),
          archived: false,
        },
        admin,
      );
      assert.equal(r.status, 201);
      const item = (await r.json()).data._id;
      assert.equal(
        (
          await request(
            "/admin/stock-movements",
            "POST",
            {
              item,
              quantity: 10,
              reference: "Opening stock",
              key: crypto.randomUUID(),
            },
            admin,
          )
        ).status,
        200,
      );
      const rr = await Promise.all([
        request(
          "/admin/stock-movements",
          "POST",
          {
            item,
            quantity: -8,
            reference: "Allocation A",
            key: crypto.randomUUID(),
          },
          admin,
        ),
        request(
          "/admin/stock-movements",
          "POST",
          {
            item,
            quantity: -8,
            reference: "Allocation B",
            key: crypto.randomUUID(),
          },
          admin,
        ),
      ]);
      assert.deepEqual(rr.map((r) => r.status).sort(), [200, 400]);
      const records = (
        await (
          await request("/admin/inventory", "GET", undefined, admin)
        ).json()
      ).data;
      assert.equal(records[0].quantity, 2);
    },
  );
  await check(
    "rescheduling conflicts preserve the original reservation",
    async () => {
      const r = await request(
        "/bookings",
        "POST",
        { ...body, date: "2027-01-11" },
        b,
      );
      assert.equal(r.status, 201);
      const other = (await r.json()).data._id;
      assert.equal(
        (
          await request(
            "/bookings/" + booking + "/reschedule",
            "PATCH",
            { date: "2027-01-11", slot: "Evening" },
            admin,
          )
        ).status,
        409,
      );
      assert.ok(await Reservation.exists({ booking, date: body.date }));
      assert.equal(
        (
          await request(
            "/bookings/" + other + "/status",
            "PATCH",
            { status: "Cancelled" },
            b,
          )
        ).status,
        200,
      );
    },
  );
  await check(
    "verified upload re-encodes images and rejects executables",
    async () => {
      const image = await (
        await import("node:fs/promises")
      ).readFile("client/public/media/palace-aerial-concept.webp");
      const form = new FormData();
      form.append("file", new Blob([image]), "test.webp");
      const r = await fetch("http://127.0.0.1:" + port + "/api/admin/uploads", {
        method: "POST",
        headers: {
          Origin: "http://localhost:5173",
          Cookie: admin.cookie,
          "X-CSRF-Token": admin.csrf,
        },
        body: form,
      });
      assert.equal(r.status, 201);
      const j = await r.json();
      const downloaded = await fetch("http://127.0.0.1:" + port + j.data.url);
      const data = Buffer.from(await downloaded.arrayBuffer());
      assert.equal(data.subarray(0, 4).toString(), "RIFF");
      assert.equal(data.subarray(8, 12).toString(), "WEBP");
      const bad = new FormData();
      bad.append(
        "file",
        new Blob(['<svg onload="alert(1)"></svg>'], { type: "image/svg+xml" }),
        "bad.svg",
      );
      const denied = await fetch(
        "http://127.0.0.1:" + port + "/api/admin/uploads",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost:5173",
            Cookie: admin.cookie,
            "X-CSRF-Token": admin.csrf,
          },
          body: bad,
        },
      );
      assert.equal(denied.status, 400);
    },
  );
  await check("stock operations are denied to customers", async () =>
    assert.equal(
      (await request("/admin/inventory", "GET", undefined, a)).status,
      403,
    ),
  );
  await check(
    "financial reversals append history and retry safely",
    async () => {
      const refundEntry = await Ledger.findOne({ type: "Refund" });
      const paymentEntry = await Ledger.findOne({ type: "Payment" });
      const body = { reference: "QA correction", key: crypto.randomUUID() };
      assert.equal(
        (
          await request(
            "/ledger/" + refundEntry!._id + "/reverse",
            "POST",
            body,
            admin,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            "/ledger/" + refundEntry!._id + "/reverse",
            "POST",
            body,
            admin,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            "/ledger/" + paymentEntry!._id + "/reverse",
            "POST",
            { ...body, key: crypto.randomUUID() },
            admin,
          )
        ).status,
        200,
      );
      const totals = await Ledger.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      assert.equal(totals[0].total, 0);
      assert.equal(await Ledger.countDocuments(), 4);
    },
  );
  await check(
    "cancellation releases inventory and permits rebooking",
    async () => {
      assert.equal(
        (
          await request(
            "/bookings/" + booking + "/status",
            "PATCH",
            { status: "Cancelled" },
            a,
          )
        ).status,
        200,
      );
      assert.equal(await Reservation.countDocuments(), 0);
      assert.equal((await request("/bookings", "POST", body, b)).status, 201);
    },
  );
  await check(
    "booking pages and date filters include records beyond the first 50",
    async () => {
      const fixtures = await Booking.insertMany(
        Array.from({ length: 55 }, (_, i) => ({
          customer: a.id,
          venue: venue._id,
          date: "2028-01-15",
          slot: "Lunch",
          event: "Nikah",
          status: "Pending",
          snapshot: { venueName: "Test" },
        })),
      );
      const page = await (
        await request(
          "/bookings?from=2028-01-01&to=2028-01-31&page=2",
          "GET",
          undefined,
          a,
        )
      ).json();
      assert.equal(page.data.length, 5);
      assert.equal(page.pagination.total, 55);
      assert.equal(page.pagination.pages, 2);
      const denied = await (
        await request(
          "/bookings?from=2028-01-01&to=2028-01-31",
          "GET",
          undefined,
          b,
        )
      ).json();
      assert.equal(denied.pagination.total, 0);
      assert.equal(
        (
          await request(
            "/bookings?from=2028-02-01&to=2028-01-01",
            "GET",
            undefined,
            a,
          )
        ).status,
        400,
      );
      await Booking.deleteMany({ _id: { $in: fixtures.map((f) => f._id) } });
    },
  );
  await check(
    "planner slots prevent conflicts and cancellation retains history",
    async () => {
      const input = {
        date: "2027-02-10",
        slot: "10:00",
        planner: admin.id,
        notes: "Venue styling consultation",
      };
      const rr = await Promise.all([
        request("/consultations", "POST", input, a),
        request("/consultations", "POST", input, b),
      ]);
      assert.deepEqual(rr.map((r) => r.status).sort(), [201, 409]);
      const winner = rr.findIndex((r) => r.status === 201),
        owner = winner === 0 ? a : b,
        other = winner === 0 ? b : a;
      const cid = (await rr[winner].json()).data._id;
      assert.equal(
        (
          await request(
            "/consultations/" + cid,
            "PATCH",
            { status: "Cancelled" },
            other,
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await request(
            "/consultations/" + cid,
            "PATCH",
            { status: "Confirmed", note: "Planning requirements recorded" },
            admin,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            "/consultations/" + cid,
            "PATCH",
            { status: "Cancelled" },
            owner,
          )
        ).status,
        200,
      );
      const history = (
        await (await request("/consultations", "GET", undefined, owner)).json()
      ).data.find((c: any) => c._id === cid);
      assert.equal(history.status, "Cancelled");
      assert.equal(history.history.length, 3);
      assert.equal(
        (await request("/consultations", "POST", input, owner)).status,
        201,
      );
    },
  );
  await check(
    "event allocations serialize stock, retry safely, and release on cancellation",
    async () => {
      const active = (
        await (await request("/bookings", "GET", undefined, b)).json()
      ).data.find((x: any) => x.status !== "Cancelled");
      const item = (
        await (
          await request("/admin/inventory", "GET", undefined, admin)
        ).json()
      ).data[0];
      const input = {
        booking: active._id,
        item: item._id,
        quantity: 2,
        key: crypto.randomUUID(),
      };
      assert.equal(
        (await request("/allocations", "POST", input, a)).status,
        403,
      );
      const rr = await Promise.all([
        request("/allocations", "POST", input, admin),
        request(
          "/allocations",
          "POST",
          { ...input, key: crypto.randomUUID() },
          admin,
        ),
      ]);
      assert.deepEqual(rr.map((r) => r.status).sort(), [201, 409]);
      const allocation = (await rr.find((r) => r.status === 201)!.json()).data;
      const retry = { ...input, key: allocation.key };
      assert.equal(
        (await request("/allocations", "POST", retry, admin)).status,
        201,
      );
      let stock = (
        await (
          await request("/admin/inventory", "GET", undefined, admin)
        ).json()
      ).data[0];
      assert.equal(stock.quantity, 0);
      assert.equal(
        (
          await request(
            "/bookings/" + active._id + "/status",
            "PATCH",
            { status: "Cancelled" },
            b,
          )
        ).status,
        200,
      );
      stock = (
        await (
          await request("/admin/inventory", "GET", undefined, admin)
        ).json()
      ).data[0];
      assert.equal(stock.quantity, 2);
      assert.equal(
        (
          await request(
            "/allocations/" + allocation._id + "/return",
            "POST",
            {},
            admin,
          )
        ).status,
        200,
      );
      stock = (
        await (
          await request("/admin/inventory", "GET", undefined, admin)
        ).json()
      ).data[0];
      assert.equal(stock.quantity, 2);
    },
  );
  await check("logout invalidates server session", async () => {
    assert.equal((await request("/auth/logout", "POST", {}, a)).status, 200);
    assert.equal((await request("/bookings", "GET", undefined, a)).status, 401);
  });
  console.log(checks + " real MongoDB integration checks passed");
} finally {
  child.kill();
  await mongoose.disconnect();
  await db.stop();
}
