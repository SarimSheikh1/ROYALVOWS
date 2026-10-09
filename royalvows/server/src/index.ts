import { listPage } from "./list.js";
import { integrations } from "./integrations.js";
import { operations, Menu, releaseEventStock } from "./operations.js";
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomBytes, createHmac } from "node:crypto";
import { z } from "zod";
import PDFDocument from "pdfkit";
import {
  User,
  Session,
  Venue,
  Package,
  Booking,
  Reservation,
  Payment,
  Ledger,
  Audit,
  Notification,
  Inquiry,
  Consultation,
  Task,
  Expense,
  Counter,
  Invoice,
  Refund,
  Service,
  Discount,
} from "./models.js";
import { price, transitions } from "./pricing.js";
const env = z
  .object({
    MONGODB_URI: z.string().min(1),
    SESSION_SECRET: z
      .string()
      .min(32)
      .refine(
        (s) => !s.startsWith("replace-"),
        "Replace the example session secret",
      ),
    CLIENT_ORIGIN: z.url(),
    PORT: z.coerce.number().default(4000),
  })
  .parse(process.env);
const app = express();
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "256kb" }));
app.use(cookieParser(env.SESSION_SECRET));
app.use("/api", rateLimit({ windowMs: 60000, limit: 180 }));
const hash = (s: string) =>
  createHmac("sha256", env.SESSION_SECRET).update(s).digest("hex");
const fail = (message: string, status = 400) =>
  Object.assign(new Error(message), { status });
app.use(async (req: any, res, next) => {
  try {
    if (req.signedCookies.rv) {
      const session = await Session.findOne({
        token: hash(req.signedCookies.rv),
        expires: { $gt: new Date() },
      }).populate("user");
      if (session) {
        req.user = session.user;
        req.session = session;
      }
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.headers.origin !== env.CLIENT_ORIGIN)
        throw fail("Origin rejected", 403);
      if (req.user && req.headers["x-csrf-token"] !== req.session.csrf)
        throw fail("Security token missing; refresh and try again", 403);
    }
    next();
  } catch (e) {
    next(e);
  }
});
function auth(req: any, _res: any, next: any) {
  if (!req.user) return next(fail("Please sign in", 401));
  next();
}
function roles(...allowed: string[]) {
  return (req: any, _res: any, next: any) => {
    if (!req.user || !allowed.includes(req.user.role))
      return next(fail("Access denied", 403));
    next();
  };
}
const admins = roles("Super Admin", "Branch Admin");
const finance = roles("Super Admin");
const id = z.string().regex(/^[a-f0-9]{24}$/i);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    "Invalid date",
  );
const slot = z.enum(["Lunch", "Evening"]);
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.VENUE_TIMEZONE || "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
today();
function scope(user: any) {
  if (user.role === "Super Admin") return {};
  if (user.role === "Customer") return { customer: user._id };
  if (user.role === "Staff") return { manager: user._id };
  return { venue: { $in: user.venues } };
}
async function ownedBooking(req: any) {
  const b = await Booking.findOne({
    _id: id.parse(req.params.id),
    ...scope(req.user),
  });
  if (!b) throw fail("Booking not found", 404);
  return b;
}
async function audit(req: any, action: string, target: string, session?: any) {
  await Audit.create(
    [{ actor: req.user._id, action, target }],
    session ? { session } : {},
  );
}
app.get("/api/health", (_req, res) =>
  res.json({
    data: {
      database: mongoose.connection.readyState === 1 ? "connected" : "offline",
    },
  }),
);
app.get("/api/auth/me", (req: any, res) =>
  res.json({
    data: req.user
      ? {
          user: {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
          },
          csrf: req.session.csrf,
        }
      : null,
  }),
);
const credentials = z.object({
  email: z.email().transform((s) => s.toLowerCase()),
  password: z.string().min(12).max(128),
  name: z.string().min(2).max(100).optional(),
});
async function login(req: any, res: any, user: any) {
  const raw = randomBytes(32).toString("hex"),
    csrf = randomBytes(32).toString("hex");
  await Session.create({
    user: user._id,
    token: hash(raw),
    csrf,
    expires: new Date(Date.now() + 86400000),
  });
  res.cookie("rv", raw, {
    signed: true,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400000,
    path: "/",
  });
  res.json({
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      csrf,
    },
  });
}
const dummyHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
const loginLimit = rateLimit({ windowMs: 900000, limit: 15 });
app.post("/api/auth/register", loginLimit, async (req, res) => {
  const b = credentials
    .extend({ name: z.string().min(2).max(100) })
    .parse(req.body);
  if (await User.exists({ email: b.email }))
    throw fail("Registration unavailable for this email");
  const u = await User.create({
    ...b,
    password: await bcrypt.hash(b.password, 12),
    role: "Customer",
  });
  await login(req, res, u);
});
app.post("/api/auth/login", loginLimit, async (req, res) => {
  const b = credentials
    .extend({ password: z.string().min(1).max(128) })
    .parse(req.body);
  const u = await User.findOne({ email: b.email }).select("+password");
  const valid = await bcrypt.compare(b.password, u?.password || dummyHash);
  if (!u || !valid) throw fail("Invalid email or password", 401);
  await login(req, res, u);
});
app.post("/api/auth/logout", auth, async (req: any, res) => {
  await Session.deleteOne({ _id: req.session._id });
  res.clearCookie("rv", { path: "/" });
  res.json({ data: true });
});
app.get("/api/venues", async (req, res) => {
  const q = z
    .object({
      search: z.string().max(100).default(""),
      guests: z.coerce.number().int().min(0).default(0),
      city: z.string().max(100).optional(),
      minPrice: z.coerce.number().int().min(0).optional(),
      maxPrice: z.coerce.number().int().min(0).optional(),
      event: z.enum(["Barat", "Walima", "Mehndi", "Nikah"]).optional(),
      facility: z.string().max(100).optional(),
      outdoor: z.enum(["true", "false"]).optional(),
    })
    .parse(req.query);
  const filter: any = { archived: false, capacity: { $gte: q.guests } };
  if (q.search)
    filter.name = {
      $regex: q.search.replace(/[.*+?^{}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  if (q.city) filter.city = q.city;
  if (q.minPrice != null || q.maxPrice != null) {
    if (q.minPrice != null && q.maxPrice != null && q.minPrice > q.maxPrice)
      throw fail("Minimum rental exceeds maximum");
    filter.rental = {
      ...(q.minPrice != null ? { $gte: q.minPrice } : {}),
      ...(q.maxPrice != null ? { $lte: q.maxPrice } : {}),
    };
  }
  if (q.event) filter.eventTypes = q.event;
  if (q.facility) filter.amenities = q.facility;
  if (q.outdoor) filter.outdoor = q.outdoor === "true";
  res.json(await listPage(Venue.find(filter).sort({ name: 1 }), req));
});
app.get("/api/venues/:id", async (req, res) => {
  const v = await Venue.findOne({
    _id: id.parse(req.params.id),
    archived: false,
  });
  if (!v) throw fail("Palace not found", 404);
  res.json({ data: v });
});
app.get("/api/services", async (_req, res) =>
  res.json(
    await listPage(Service.find({ archived: false }).sort({ name: 1 }), _req),
  ),
);
app.get("/api/menus", async (_req, res) =>
  res.json(
    await listPage(Menu.find({ archived: false }).sort({ name: 1 }), _req),
  ),
);
app.get("/api/packages", async (_req, res) =>
  res.json({
    data: await Package.find({ archived: false }).sort({ perHead: 1 }),
  }),
);
app.get("/api/availability/:id", async (req, res) => {
  const month = z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .parse(req.query.month);
  res.json({
    data: await Reservation.find({
      venue: id.parse(req.params.id),
      date: { $gte: month + "-01", $lte: month + "-31" },
    }).select("date slot maintenance"),
  });
});
const bookingInput = z.object({
  venue: z.string().regex(/^[a-f0-9]{24}$/i, "Choose a valid palace."),
  package: z.string().regex(/^[a-f0-9]{24}$/i, "Choose a wedding collection."),
  date,
  slot,
  event: z.enum(["Barat", "Walima", "Mehndi", "Nikah"]),
  guests: z.number().int().min(1).max(5000),
  theme: z.enum([
    "Royal Gold",
    "Ivory Elegance",
    "Enchanted Garden",
    "Crystal Palace",
    "Rose Gold Romance",
    "Mughal Heritage",
    "Midnight Luxury",
    "Modern Minimal Glamour",
  ]),
  notes: z.string().max(2000).default(""),
  addons: z.array(id).max(15).default([]),
  discountCode: z.string().max(30).default(""),
  cateringMenu: id.optional(),
});
async function estimate(b: any) {
  const [v, p] = await Promise.all([
    Venue.findOne({ _id: b.venue, archived: false }),
    Package.findOne({ _id: b.package, archived: false }),
  ]);
  if (!v || !p) throw fail("Collection or palace unavailable");
  if (!v.eventTypes.includes(b.event))
    throw fail("This occasion is not available at this venue");
  if (b.date < today()) throw fail("Choose a future date");
  const selectedServices = await Service.find({
    _id: { $in: b.addons },
    archived: false,
  });
  if (
    selectedServices.length !== new Set(b.addons).size ||
    new Set(b.addons).size !== b.addons.length
  )
    throw fail("An add-on is unavailable or duplicated");
  const includedServices = await Service.find({ includedWithPackage: true, archived: false });
  const services = [...selectedServices, ...includedServices.filter((included) => !selectedServices.some((selected) => selected._id.equals(included._id)))];
  const menu = b.cateringMenu
    ? await Menu.findOne({ _id: b.cateringMenu, archived: false })
    : null;
  if (b.cateringMenu && !menu) throw fail("Catering menu unavailable");
  const discount = b.discountCode
    ? await Discount.findOne({
        code: b.discountCode,
        venue: v._id,
        archived: false,
        expires: { $gte: new Date(b.date) },
      })
    : null;
  if (b.discountCode && !discount)
    throw fail("Discount code invalid for this venue or event date");
  const addonTotal = services.reduce(
    (n, r) => n + (r.includedWithPackage ? 0 : r.rate!) * (r.unit === "guest" ? b.guests : 1),
    0,
  );
  return {
    ...price(v as any, p as any, b.guests, {
      addons: addonTotal,
      discount: discount?.amount || 0,
      menuPerHead: menu?.perHead ?? undefined,
    }),
    addonItems: services.map((r) => ({
      name: r.name,
      rate: r.includedWithPackage ? 0 : r.rate,
      includedWithPackage: r.includedWithPackage,
      unit: r.unit,
    })),
    menu: menu?.name || "Collection menu",
    venueName: v.name,
    date: b.date,
    slot: b.slot,
    theme: b.theme,
  };
}
app.post("/api/estimate", async (req, res) =>
  res.json({ data: await estimate(bookingInput.parse(req.body)) }),
);
app.post("/api/bookings", roles("Customer"), async (req: any, res) => {
  const b = bookingInput.parse(req.body);
  const snapshot = await estimate(b);
  let result: any;
  await mongoose.connection.transaction(async (session) => {
    [result] = await Booking.create(
      [{ ...b, customer: req.user._id, snapshot }],
      { session },
    );
    await Reservation.create(
      [{ venue: b.venue, date: b.date, slot: b.slot, booking: result._id }],
      { session },
    );
    const counter = await Counter.findOneAndUpdate(
      { key: "invoice" },
      { $inc: { value: 1 } },
      { session, upsert: true, new: true },
    );
    await Invoice.create(
      [
        {
          booking: result._id,
          number: "RV-" + String(counter.value).padStart(8, "0"),
          snapshot,
        },
      ],
      { session },
    );
    await Notification.create(
      [
        {
          user: req.user._id,
          message:
            "Your wedding request has been received. The slot is reserved pending review.",
        },
      ],
      { session },
    );
    await audit(req, "booking.create", String(result._id), session);
  });
  res.status(201).json({ data: result });
});
app.get("/api/bookings", auth, async (req: any, res) => {
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(1)
    .parse(req.query.page);
  const filters = z
    .object({
      from: date.optional(),
      to: date.optional(),
      venue: id.optional(),
      status: z
        .enum([
          "Pending",
          "Awaiting Advance",
          "Confirmed",
          "In Progress",
          "Completed",
          "Cancelled",
        ])
        .optional(),
    })
    .parse(req.query);
  if (filters.from && filters.to && filters.from > filters.to)
    throw fail("Invalid date range");
  const filter: any = { ...scope(req.user) };
  if (req.user.role === "Staff") {
    delete filter.manager;
    filter._id = {
      $in: await Task.distinct("booking", { assignedTo: req.user._id }),
    };
  }
  if (filters.from || filters.to)
    filter.date = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    };
  if (filters.venue) filter.$and = [{ venue: filters.venue }];
  if (filters.status) filter.status = filters.status;
  const total = await Booking.countDocuments(filter);
  const records = await Booking.find(filter)
    .populate("venue", "name")
    .populate("customer", "name email")
    .sort({ date: 1, _id: 1 })
    .skip((page - 1) * 50)
    .limit(50)
    .lean();
  res.json({
    pagination: { page, pageSize: 50, total, pages: Math.ceil(total / 50) },
    data: records.map((b: any) => {
      if (!["Customer", "Super Admin"].includes(req.user.role)) {
        delete b.paid;
        b.snapshot = { venueName: b.snapshot.venueName };
      }
      return b;
    }),
  });
});
app.patch("/api/bookings/:id/status", auth, async (req: any, res) => {
  const b = await ownedBooking(req);
  const { status } = z.object({ status: z.string() }).parse(req.body);
  if (req.user.role === "Customer" && status !== "Cancelled")
    throw fail("Access denied", 403);
  if (req.user.role === "Staff") throw fail("Access denied", 403);
  if (!transitions[b.status!]?.includes(status))
    throw fail("Invalid status transition");
  if (status === "Confirmed" && b.paid! <= 0)
    throw fail("Approve an advance before confirming");
  await mongoose.connection.transaction(async (session) => {
    const updated = await Booking.updateOne(
      { _id: b._id, status: b.status },
      { $set: { status } },
      { session },
    );
    if (!updated.modifiedCount) throw fail("Booking changed; refresh", 409);
    if (status === "Cancelled")
      await Reservation.deleteOne({ booking: b._id }, { session });
    if (["Cancelled", "Completed"].includes(status))
      await releaseEventStock(
        b._id,
        status === "Cancelled",
        req.user._id,
        session,
      );
    await Notification.create(
      [{ user: b.customer, message: "Booking status: " + status }],
      { session },
    );
    await audit(req, "booking.status", String(b._id), session);
  });
  res.json({ data: true });
});
app.patch(
  "/api/bookings/:id/plan",
  roles("Customer"),
  async (req: any, res) => {
    const b = await ownedBooking(req);
    const input = z
      .object({
        checklist: z
          .array(z.object({ title: z.string().max(200), done: z.boolean() }))
          .max(100),
        guestList: z
          .array(
            z.object({
              name: z.string().min(1).max(100),
              table: z.string().max(50),
            }),
          )
          .max(Math.min(2000, b.guests!)),
        tables: z
          .array(
            z.object({
              name: z.string().min(1).max(50),
              seats: z.number().int().min(1).max(100),
              x: z.number().min(0).max(90),
              y: z.number().min(0).max(85),
            }),
          )
          .max(200)
          .default([]),
        timeline: z
          .array(
            z.object({ time: z.string().max(30), title: z.string().max(200) }),
          )
          .max(100),
        notes: z.string().max(2000),
      })
      .parse(req.body);
    if (new Set(input.tables.map((t) => t.name)).size !== input.tables.length)
      throw fail("Table names must be unique");
    if (input.tables.length)
      for (const table of input.tables) {
        if (
          input.guestList.filter((g) => g.table === table.name).length >
          table.seats
        )
          throw fail("Table " + table.name + " exceeds its seat capacity");
      }
    await Booking.updateOne({ _id: b._id }, { $set: input });
    await audit(req, "booking.plan", String(b._id));
    res.json({ data: true });
  },
);
app.patch(
  "/api/bookings/:id/timeline",
  roles("Super Admin", "Branch Admin", "Hall Manager"),
  async (req: any, res) => {
    const b = await ownedBooking(req);
    const input = z
      .object({
        timeline: z
          .array(
            z.object({
              time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
              title: z.string().min(1).max(200),
            }),
          )
          .max(100),
      })
      .parse(req.body);
    await Booking.updateOne({ _id: b._id }, { $set: input });
    await audit(req, "booking.timeline", String(b._id));
    res.json({ data: true });
  },
);
app.patch("/api/bookings/:id/manager", admins, async (req: any, res) => {
  const b = await ownedBooking(req);
  const manager = id.parse(req.body.manager);
  const u = await User.findOne({
    _id: manager,
    role: "Hall Manager",
    venues: b.venue,
  });
  if (!u) throw fail("Manager must be assigned to this venue");
  b.manager = u._id;
  await b.save();
  await audit(req, "booking.assign", String(b._id));
  res.json({ data: true });
});
app.post(
  "/api/bookings/:id/payments",
  roles("Customer"),
  async (req: any, res) => {
    const b = await ownedBooking(req);
    const input = z
      .object({
        amount: z.number().int().positive().max(1000000000),
        method: z.enum(["Cash", "Bank Transfer", "Easypaisa", "JazzCash"]),
        reference: z.string().min(3).max(200),
        key: z.string().uuid(),
      })
      .parse(req.body);
    const existing = await Payment.findOne({ key: input.key });
    if (existing) {
      if (
        String(existing.customer) !== String(req.user._id) ||
        String(existing.booking) !== String(b._id) ||
        existing.amount !== input.amount ||
        existing.reference !== input.reference ||
        existing.method !== input.method
      )
        throw fail("Idempotency key conflict", 409);
      return res.json({ data: existing });
    }
    if (b.status === "Cancelled" || input.amount > b.snapshot.total - b.paid!)
      throw fail("Payment exceeds balance or booking is cancelled");
    res.status(201).json({
      data: await Payment.create({
        ...input,
        booking: b._id,
        customer: req.user._id,
      }),
    });
  },
);
app.patch("/api/bookings/:id/reschedule", admins, async (req: any, res) => {
  const b = await ownedBooking(req);
  if (!["Pending", "Awaiting Advance", "Confirmed"].includes(b.status!))
    throw fail("This booking cannot be rescheduled");
  const input = z.object({ date, slot }).parse(req.body);
  if (input.date < today()) throw fail("Choose a future date");
  await mongoose.connection.transaction(async (session) => {
    const updated = await Booking.updateOne(
      { _id: b._id, date: b.date, slot: b.slot, status: b.status },
      {
        $set: {
          date: input.date,
          slot: input.slot,
          "snapshot.date": input.date,
          "snapshot.slot": input.slot,
        },
      },
      { session },
    );
    if (!updated.modifiedCount) throw fail("Booking changed; refresh", 409);
    await Reservation.deleteOne({ booking: b._id }, { session });
    await Reservation.create([{ venue: b.venue, ...input, booking: b._id }], {
      session,
    });
    await Notification.create(
      [
        {
          user: b.customer,
          message: "Booking rescheduled to " + input.date + " " + input.slot,
        },
      ],
      { session },
    );
    await audit(req, "booking.reschedule", String(b._id), session);
  });
  res.json({ data: true });
});
app.get("/api/payments/:id/receipt", auth, async (req: any, res) => {
  const p = await Payment.findOne({
    _id: id.parse(req.params.id),
    status: "Approved",
    ...(req.user.role === "Customer" ? { customer: req.user._id } : {}),
  });
  if (!p || !["Customer", "Super Admin"].includes(req.user.role))
    throw fail("Receipt unavailable", 404);
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  res.type("application/pdf").attachment("RoyalVows-receipt-" + p._id + ".pdf");
  doc.pipe(res);
  doc
    .fillColor("#A78042")
    .fontSize(32)
    .text("ROYALVOWS")
    .fillColor("#090B10")
    .fontSize(20)
    .text("Approved payment receipt")
    .moveDown()
    .fontSize(12)
    .text("Receipt: RVP-" + p._id)
    .text("Booking: " + p.booking)
    .text("Amount: PKR " + (p.amount! / 100).toFixed(2))
    .text("Method: " + p.method)
    .text("Reference: " + p.reference)
    .text(
      "Payment verified by an authorized administrator. Refunds are tracked separately.",
    );
  doc.end();
});
app.get("/api/payments", auth, async (req: any, res) => {
  if (!["Customer", "Super Admin"].includes(req.user.role))
    throw fail("Financial access denied", 403);
  res.json({
    data: await Payment.find(
      req.user.role === "Customer" ? { customer: req.user._id } : {},
    )
      .sort({ createdAt: -1 })
      .limit(100),
  });
});
app.post("/api/payments/:id/approve", finance, async (req: any, res) => {
  await mongoose.connection.transaction(async (session) => {
    const p = await Payment.findOneAndUpdate(
      { _id: id.parse(req.params.id), status: "Pending" },
      { $set: { status: "Approved", approvedBy: req.user._id } },
      { session, new: true },
    );
    if (!p) {
      if (
        await Payment.exists({
          _id: req.params.id,
          status: "Approved",
        }).session(session)
      )
        return;
      throw fail("Payment not found", 404);
    }
    const b = await Booking.findOneAndUpdate(
      {
        _id: p.booking,
        status: { $ne: "Cancelled" },
        $expr: { $lte: [{ $add: ["$paid", p.amount] }, "$snapshot.total"] },
      },
      { $inc: { paid: p.amount } },
      { session, new: true },
    );
    if (!b) throw fail("Payment exceeds balance or booking cancelled");
    await Ledger.create(
      [
        {
          booking: p.booking,
          amount: p.amount,
          type: "Payment",
          key: "payment:" + p._id,
          actor: req.user._id,
          reference: p.reference,
        },
      ],
      { session },
    );
    await Notification.create(
      [{ user: b.customer, message: "Payment approved. Thank you." }],
      { session },
    );
    await audit(req, "payment.approve", String(p._id), session);
  });
  res.json({ data: true });
});
app.post("/api/payments/:id/reject", finance, async (req: any, res) => {
  const p = await Payment.findOneAndUpdate(
    { _id: id.parse(req.params.id), status: "Pending" },
    { $set: { status: "Rejected", approvedBy: req.user._id } },
  );
  if (!p) throw fail("Only pending reports can be rejected");
  await audit(req, "payment.reject", String(p._id));
  res.json({ data: true });
});
app.patch("/api/inquiries/:id", finance, async (req: any, res) => {
  const r = await Inquiry.findByIdAndUpdate(id.parse(req.params.id), {
    status: z
      .enum(["Confirmed", "Rejected", "Resolved"])
      .parse(req.body.status),
  });
  if (!r) throw fail("Inquiry not found", 404);
  await audit(req, "inquiry.status", req.params.id);
  res.json({ data: true });
});
app.patch("/api/notifications/:id", auth, async (req: any, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: id.parse(req.params.id), user: req.user._id },
    { read: true },
  );
  if (!n) throw fail("Notification not found", 404);
  res.json({ data: true });
});
app.post("/api/bookings/:id/refund", finance, async (req: any, res) => {
  const b = await ownedBooking(req);
  const input = z
    .object({
      amount: z.number().int().positive(),
      reference: z.string().min(3).max(200),
      key: z.string().uuid(),
    })
    .parse(req.body);
  await mongoose.connection.transaction(async (session) => {
    const existing = await Ledger.findOne({
      key: "refund:" + input.key,
    }).session(session);
    if (existing) {
      if (
        String(existing.booking) !== String(b._id) ||
        existing.amount !== -input.amount ||
        existing.reference !== input.reference
      )
        throw fail("Idempotency conflict", 409);
      return;
    }
    const updated = await Booking.findOneAndUpdate(
      { _id: b._id, paid: { $gte: input.amount } },
      { $inc: { paid: -input.amount } },
      { session },
    );
    if (!updated) throw fail("Refund exceeds approved payments");
    await Refund.create([{ ...input, booking: b._id, actor: req.user._id }], {
      session,
    });
    await Ledger.create(
      [
        {
          ...input,
          booking: b._id,
          type: "Refund",
          amount: -input.amount,
          key: "refund:" + input.key,
          actor: req.user._id,
        },
      ],
      { session },
    );
    await audit(req, "payment.refund", String(b._id), session);
  });
  res.json({ data: true });
});
app.get("/api/ledger", auth, async (req: any, res) => {
  if (!["Super Admin", "Customer"].includes(req.user.role))
    throw fail("Access denied", 403);
  const filter =
    req.user.role === "Customer"
      ? {
          booking: {
            $in: (
              await Booking.find({ customer: req.user._id }).select("_id")
            ).map((b) => b._id),
          },
        }
      : {};
  res.json(await listPage(Ledger.find(filter).sort({ createdAt: -1 }), req));
});
app.post("/api/ledger/:id/reverse", finance, async (req: any, res) => {
  const input = z
    .object({ reference: z.string().min(3).max(200), key: z.string().uuid() })
    .parse(req.body);
  await mongoose.connection.transaction(async (session) => {
    const original = await Ledger.findById(id.parse(req.params.id)).session(
      session,
    );
    if (
      !original ||
      !["Payment", "Refund", "Supplier Payment"].includes(original.type!)
    )
      throw fail("This entry cannot be reversed");
    const key = "reversal:" + original._id;
    const prior = await Ledger.findOne({ key }).session(session);
    if (prior) {
      if (prior.reference !== input.reference)
        throw fail("Reversal already recorded with a different reference", 409);
      return;
    }
    const amount = -original.amount!;
    if (original.booking) {
      const filter: any = { _id: original.booking };
      if (amount < 0) filter.paid = { $gte: -amount };
      else
        filter.$expr = {
          $lte: [{ $add: ["$paid", amount] }, "$snapshot.total"],
        };
      if (
        !(await Booking.findOneAndUpdate(
          filter,
          { $inc: { paid: amount } },
          { session },
        ))
      )
        throw fail("Reversal would invalidate the booking balance");
      if (original.type === "Payment")
        await Payment.updateOne(
          { key: { $exists: true }, _id: original.key?.split(":")[1] },
          { $set: { status: "Reversed" } },
          { session },
        );
    }
    await Ledger.create(
      [
        {
          booking: original.booking,
          amount,
          type: original.type + " Reversal",
          key,
          reference: input.reference,
          actor: req.user._id,
        },
      ],
      { session },
    );
    await audit(req, "ledger.reverse", String(original._id), session);
  });
  res.json({ data: true });
});
app.post("/api/expenses/:id/reverse", finance, async (req: any, res) => {
  const input = z
    .object({ reference: z.string().min(3).max(200) })
    .parse(req.body);
  await mongoose.connection.transaction(async (session) => {
    const original = await Expense.findById(id.parse(req.params.id)).session(
      session,
    );
    if (!original || original.amount! <= 0)
      throw fail("Expense cannot be reversed");
    const key = "expense-reversal:" + original._id;
    const prior = await Expense.findOne({ key }).session(session);
    if (prior) return;
    await Expense.create(
      [
        {
          amount: -original.amount!,
          category: original.category,
          description: "Reversal: " + input.reference,
          key,
          actor: req.user._id,
        },
      ],
      { session },
    );
    await audit(req, "expense.reverse", String(original._id), session);
  });
  res.json({ data: true });
});
app.get("/api/bookings/:id/invoice", auth, async (req: any, res) => {
  const b = await ownedBooking(req);
  if (!["Customer", "Super Admin"].includes(req.user.role))
    throw fail("Financial access denied", 403);
  const u = await User.findById(b.customer);
  const invoice = await Invoice.findOne({ booking: b._id });
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="RoyalVows-' + b._id + '.pdf"',
  );
  doc.pipe(res);
  doc.fillColor("#A78042").fontSize(32).text("ROYALVOWS");
  doc
    .fillColor("#090B10")
    .fontSize(12)
    .text("Every Love Story Deserves a Palace")
    .moveDown(2);
  doc
    .fontSize(20)
    .text("Booking invoice")
    .fontSize(10)
    .text("Invoice: " + (invoice?.number || "RV-" + b._id))
    .text("Booking: " + b._id)
    .text("Customer: " + u?.name)
    .text("Palace: " + b.snapshot.venueName)
    .text("Event: " + b.event + " | " + b.date + " | " + b.slot)
    .text(
      "Guests: " +
        b.guests +
        " | Per-head rate: PKR " +
        (b.snapshot.perHead / 100).toFixed(2),
    )
    .text("Collection: " + b.snapshot.collection)
    .text("Theme: " + b.theme)
    .moveDown();
  for (const key of [
    "rental",
    "catering",
    "decor",
    "addons",
    "discount",
    "tax",
    "total",
  ])
    doc
      .fontSize(12)
      .text(key.toUpperCase() + ": PKR " + (b.snapshot[key] / 100).toFixed(2));
  doc
    .moveDown()
    .text("Approved payments: PKR " + (b.paid! / 100).toFixed(2))
    .text("Balance: PKR " + ((b.snapshot.total - b.paid!) / 100).toFixed(2))
    .text("Status: " + b.status)
    .moveDown()
    .fontSize(9)
    .text(
      "Demo venue quotation. Confirm legal venue identity and contract terms before production use. Refunds are recorded separately.",
    );
  doc.end();
});
app.post("/api/inquiries", async (req: any, res) => {
  const b = z
    .object({
      name: z.string().min(2).max(100),
      email: z.email(),
      message: z.string().min(10).max(2000),
    })
    .parse(req.body);
  res
    .status(201)
    .json({ data: await Inquiry.create({ ...b, customer: req.user?._id }) });
});
app.get("/api/inquiries", auth, async (req: any, res) => {
  if (!["Customer", "Super Admin"].includes(req.user.role))
    throw fail("Access denied", 403);
  res.json(
    await listPage(
      Inquiry.find(
        req.user.role === "Customer" ? { customer: req.user._id } : {},
      ).sort({ createdAt: -1 }),
      req,
    ),
  );
});
app.get("/api/planners", auth, async (_req, res) =>
  res.json({
    data: await User.find({
      role: { $in: ["Super Admin", "Hall Manager", "Branch Admin"] },
    })
      .select("name role")
      .sort({ name: 1, _id: 1 }),
  }),
);
app.get("/api/consultations/availability", auth, async (req, res) => {
  const day = date.parse(req.query.date),
    planner = id.parse(req.query.planner);
  if (
    !(await User.exists({
      _id: planner,
      role: { $in: ["Super Admin", "Hall Manager", "Branch Admin"] },
    }))
  )
    throw fail("Planner not found", 404);
  const taken = await Consultation.find({
    date: day,
    planner,
    status: { $in: ["Pending", "Confirmed"] },
  }).select("slot");
  res.json({
    data: ["10:00", "12:00", "15:00", "17:00"].map((slot) => ({
      slot,
      available: !taken.some((c) => c.slot === slot),
    })),
  });
});
app.post("/api/consultations", roles("Customer"), async (req: any, res) => {
  const b = z
    .object({
      date,
      slot: z.enum(["10:00", "12:00", "15:00", "17:00"]),
      notes: z.string().max(1000),
      planner: id,
    })
    .parse(req.body);
  if (b.date < today()) throw fail("Choose a future date");
  if (
    !(await User.exists({
      _id: b.planner,
      role: { $in: ["Super Admin", "Hall Manager", "Branch Admin"] },
    }))
  )
    throw fail("Planner not found", 404);
  res
    .status(201)
    .json({
      data: await Consultation.create({
        ...b,
        customer: req.user._id,
        history: [{ action: "Requested", note: b.notes, actor: req.user._id }],
      }),
    });
});
app.get("/api/consultations", auth, async (req: any, res) => {
  if (req.user.role === "Staff") throw fail("Access denied", 403);
  const filter =
    req.user.role === "Customer"
      ? { customer: req.user._id }
      : req.user.role === "Super Admin"
        ? {}
        : { planner: req.user._id };
  res.json({
    data: await Consultation.find(filter)
      .populate("planner", "name")
      .populate("customer", "name")
      .sort({ date: 1, slot: 1, _id: 1 }),
  });
});
app.patch("/api/consultations/:id", auth, async (req: any, res) => {
  const input = z
    .object({
      status: z.enum(["Confirmed", "Completed", "Cancelled"]).optional(),
      note: z.string().min(1).max(2000).optional(),
    })
    .refine((v) => v.status || v.note, "Choose a status or enter a note")
    .parse(req.body);
  if (req.user.role === "Staff") throw fail("Access denied", 403);
  if (
    req.user.role === "Customer" &&
    (input.status !== "Cancelled" || input.note)
  )
    throw fail("Customers can only cancel their consultation", 403);
  const filter: any = { _id: id.parse(req.params.id) };
  if (req.user.role === "Customer") filter.customer = req.user._id;
  else if (req.user.role !== "Super Admin") filter.planner = req.user._id;
  const c = await Consultation.findOne(filter);
  if (!c) throw fail("Consultation not found", 404);
  if (
    input.status &&
    !(
      {
        Pending: ["Confirmed", "Cancelled"],
        Confirmed: ["Completed", "Cancelled"],
      } as Record<string, string[]>
    )[c.status!]?.includes(input.status)
  )
    throw fail("Invalid consultation status transition");
  const result = await Consultation.findOneAndUpdate(
    { ...filter, status: c.status },
    {
      $set: input.status ? { status: input.status } : {},
      $push: {
        history: {
          action: input.status || "Note",
          note: input.note || "",
          actor: req.user._id,
          time: new Date(),
        },
      },
    },
    { new: true },
  );
  if (!result) throw fail("Consultation changed; refresh", 409);
  await audit(req, "consultation." + (input.status || "note"), String(c._id));
  res.json({ data: result });
});
app.get("/api/notifications", auth, async (req: any, res) =>
  res.json(
    await listPage(
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }),
      req,
    ),
  ),
);
app.get("/api/tasks", auth, async (req: any, res) => {
  let filter: any = {};
  if (req.user.role === "Customer") throw fail("Access denied", 403);
  if (req.user.role === "Staff") filter = { assignedTo: req.user._id };
  else if (req.user.role !== "Super Admin")
    filter = { venue: { $in: req.user.venues } };
  res.json(await listPage(Task.find(filter).sort({ createdAt: -1 }), req));
});
app.post(
  "/api/tasks",
  roles("Super Admin", "Branch Admin", "Hall Manager"),
  async (req: any, res) => {
    const input = z
      .object({
        booking: id,
        title: z.string().min(3).max(200),
        assignedTo: id,
      })
      .parse(req.body);
    const b = await Booking.findOne({ _id: input.booking, ...scope(req.user) });
    if (!b) throw fail("Booking not found", 404);
    if (
      !(await User.exists({
        _id: input.assignedTo,
        role: { $in: ["Staff", "Hall Manager"] },
        venues: b.venue,
      }))
    )
      throw fail("Assignee unavailable");
    const task = await Task.create({ ...input, venue: b.venue });
    await Notification.create({
      user: input.assignedTo,
      message: "New task: " + input.title,
    });
    res.status(201).json({ data: task });
  },
);
app.patch("/api/tasks/:id", auth, async (req: any, res) => {
  if (req.user.role === "Customer") throw fail("Access denied", 403);
  const filter: any = { _id: id.parse(req.params.id) };
  if (req.user.role === "Staff") filter.assignedTo = req.user._id;
  else if (req.user.role !== "Super Admin")
    filter.venue = { $in: req.user.venues };
  const result = await Task.findOneAndUpdate(filter, {
    status: z.enum(["To Do", "In Progress", "Done"]).parse(req.body.status),
  });
  if (!result) throw fail("Task not found", 404);
  res.json({ data: true });
});
app.get(
  "/api/team-members",
  roles("Super Admin", "Branch Admin", "Hall Manager"),
  async (req: any, res) =>
    res.json(
      await listPage(
        User.find({
          role: { $in: ["Hall Manager", "Staff"] },
          ...(req.user.role === "Super Admin"
            ? {}
            : { venues: { $in: req.user.venues } }),
        })
          .select("name role venues")
          .sort({ name: 1 }),
        req,
      ),
    ),
);
app.get("/api/admin/users", finance, async (_req, res) =>
  res.json(
    await listPage(
      User.find().select("name email role venues").sort({ name: 1 }),
      _req,
    ),
  ),
);
app.patch("/api/admin/users/:id", finance, async (req: any, res) => {
  const input = z
    .object({
      role: z.enum(["Customer", "Branch Admin", "Hall Manager", "Staff"]),
      venues: z.array(id).max(100),
    })
    .parse(req.body);
  if (req.params.id === String(req.user._id))
    throw fail("Cannot change own role");
  await User.findOneAndUpdate(
    { _id: id.parse(req.params.id), role: { $ne: "Super Admin" } },
    input,
  );
  await Session.deleteMany({ user: req.params.id });
  await audit(req, "user.permissions", req.params.id);
  res.json({ data: true });
});
const venueInput = z.object({
  name: z.string().min(3).max(100),
  city: z.string().min(2).max(100),
  address: z.string().max(300).default(""),
  parkingCapacity: z.number().int().min(0).max(10000).default(0),
  floorPlan: z.string().max(1000).default(""),
  demo: z.boolean().default(true),
  capacity: z.number().int().min(1).max(5000),
  rental: z.number().int().nonnegative().max(1000000000),
  outdoor: z.boolean(),
  description: z.string().min(10).max(3000),
  amenities: z.array(z.string().max(100)).max(30),
  image: z.union([
    z.url().refine((s) => s.startsWith("https://")),
    z.string().regex(new RegExp("^/(api/)?media/[a-zA-Z0-9._-]+$")),
  ]),
  taxBps: z.number().int().min(0).max(10000),
  archived: z.boolean().default(false),
});
const packInput = z
  .object({
    name: z.string().min(3).max(100),
    perHead: z.number().int().nonnegative().max(10000000),
    decor: z.number().int().nonnegative().max(1000000000),
    minGuests: z.number().int().min(1),
    maxGuests: z.number().int().min(1).max(5000),
    inclusions: z.array(z.string().max(100)).max(30),
    archived: z.boolean().default(false),
  })
  .refine((p) => p.minGuests <= p.maxGuests);
for (const [path, Model, validator] of [
  ["venues", Venue, venueInput],
  ["packages", Package, packInput],
] as const) {
  app.post("/api/admin/" + path, finance, async (req: any, res) => {
    const record = await (Model as any).create(
      validator.parse(req.body) as any,
    );
    await audit(req, path + ".create", String(record._id));
    res.status(201).json({ data: record });
  });
  app.put("/api/admin/" + path + "/:id", finance, async (req: any, res) => {
    const record = await (Model as any).findByIdAndUpdate(
      id.parse(req.params.id),
      validator.parse(req.body),
      { new: true, runValidators: true },
    );
    if (!record) throw fail("Not found", 404);
    await audit(req, path + ".edit", String(record._id));
    res.json({ data: record });
  });
}
app.post("/api/admin/maintenance", admins, async (req: any, res) => {
  const b = z.object({ venue: id, date, slot }).parse(req.body);
  if (
    req.user.role !== "Super Admin" &&
    !req.user.venues.some((v: any) => String(v) === b.venue)
  )
    throw fail("Access denied", 403);
  res
    .status(201)
    .json({ data: await Reservation.create({ ...b, maintenance: true }) });
});
app.get("/api/admin/maintenance", admins, async (req: any, res) =>
  res.json(
    await listPage(
      Reservation.find({
        maintenance: true,
        ...(req.user.role === "Super Admin"
          ? {}
          : { venue: { $in: req.user.venues } }),
      }).sort({ date: 1 }),
      req,
    ),
  ),
);
app.delete("/api/admin/maintenance/:id", admins, async (req: any, res) => {
  const r = await Reservation.findOneAndDelete({
    _id: id.parse(req.params.id),
    maintenance: true,
    ...(req.user.role === "Super Admin"
      ? {}
      : { venue: { $in: req.user.venues } }),
  });
  if (!r) throw fail("Maintenance block not found", 404);
  await audit(req, "maintenance.release", String(r._id));
  res.json({ data: true });
});
app.get("/api/expenses", finance, async (_req, res) =>
  res.json(await listPage(Expense.find().sort({ createdAt: -1 }), _req)),
);
app.post("/api/expenses", finance, async (req: any, res) => {
  const b = z
    .object({
      amount: z.number().int().positive(),
      category: z.string().min(2).max(100),
      description: z.string().min(3).max(500),
      key: z.string().uuid(),
    })
    .parse(req.body);
  res.status(201).json({
    data: await Expense.findOneAndUpdate(
      { key: b.key },
      { $setOnInsert: { ...b, actor: req.user._id } },
      { upsert: true, new: true },
    ),
  });
});
app.get("/api/audit", finance, async (_req, res) =>
  res.json(await listPage(Audit.find().sort({ createdAt: -1 }), _req)),
);
app.get("/api/reports", finance, async (req, res) => {
  const from = date.parse(req.query.from),
    to = date.parse(req.query.to);
  if (from > to) throw fail("Invalid range");
  const range = {
    createdAt: {
      $gte: new Date(from),
      $lt: new Date(new Date(to).getTime() + 86400000),
    },
  };
  const [entries, expenses, bookings] = await Promise.all([
    Ledger.find(range),
    Expense.find(range),
    Booking.find({
      date: { $gte: from, $lte: to },
      status: { $ne: "Cancelled" },
    }),
  ]);
  const collections = entries
      .filter((e) =>
        ["Payment", "Refund", "Payment Reversal", "Refund Reversal"].includes(
          e.type!,
        ),
      )
      .reduce((n, e) => n + e.amount!, 0),
    costs = expenses.reduce((n, e) => n + e.amount!, 0);
  const supplierOutflow = -entries
    .filter((e) =>
      ["Supplier Payment", "Supplier Payment Reversal"].includes(e.type!),
    )
    .reduce((n, e) => n + e.amount!, 0);
  res.json({
    data: {
      from,
      to,
      netCollections: collections,
      expenses: costs,
      bookedInvoiceTotal: bookings.reduce((n, b) => n + b.snapshot.total, 0),
      receivables: bookings.reduce((n, b) => n + b.snapshot.total - b.paid!, 0),
      bookings: bookings.length,
      supplierOutflow,
      cashLessExpenses: collections - costs - supplierOutflow,
      definitions:
        "Collections by ledger posting date; bookings and receivables by event date. Cash less expenses is not recognized profit.",
    },
  });
});
app.get("/api/reports/export", finance, async (_req, res) => {
  const rows = await Ledger.find().sort({ createdAt: 1 }).limit(10000);
  res
    .type("text/csv")
    .attachment("royalvows-ledger.csv")
    .send(
      "date,booking,type,amount_minor\n" +
        rows
          .map((r: any) =>
            [r.createdAt.toISOString(), r.booking, r.type, r.amount].join(","),
          )
          .join("\n"),
    );
});
operations(app, auth, roles);
integrations(app, auth, roles, loginLimit);
app.use((_req, _res, next) => next(fail("Endpoint not found", 404)));
app.use((error: any, _req: any, res: any, _next: any) => {
  const status =
    error instanceof z.ZodError
      ? 400
      : error.code === "LIMIT_FILE_SIZE"
        ? 413
        : error.code === 11000
          ? 409
          : error.status || 500;
  res.status(status).json({
    error: {
      message:
        status === 500
          ? "Service unavailable. Please retry."
          : error.code === 11000
            ? "This slot or record is already reserved"
            : error instanceof z.ZodError
              ? error.issues.map((i: any) => i.message).join("; ")
              : error.message,
    },
  });
});
await mongoose.connect(env.MONGODB_URI);
await Promise.all(
  mongoose.modelNames().map((name) => mongoose.model(name).init()),
);
// Replace the former global slot index after the new planner-slot index exists.
const consultationIndexes = await Consultation.collection.indexes();
if (consultationIndexes.some((i) => i.name === "date_1_slot_1"))
  await Consultation.collection.dropIndex("date_1_slot_1");
await Counter.updateOne(
  { key: "invoice" },
  { $setOnInsert: { value: 0 } },
  { upsert: true },
);
app.listen(
  env.PORT,
  process.env.HOST ||
    (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
  () => console.log("RoyalVows API on port " + env.PORT),
);
