import { MongoMemoryReplSet } from "mongodb-memory-server";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import {
  User,
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
  for (let i = 0; i < 100; i++) {
    try {
      if ((await request("/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
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
  await check("stock operations are denied to customers", async () =>
    assert.equal(
      (await request("/admin/inventory", "GET", undefined, a)).status,
      403,
    ),
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
