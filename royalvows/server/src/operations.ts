import { listPage } from "./list.js";
import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import {
  Booking,
  User,
  Audit,
  Ledger,
  Service,
  Discount,
  Task,
} from "./models.js";
const options = { timestamps: true };
const Inventory = mongoose.model(
  "InventoryItem",
  new Schema(
    {
      name: { type: String, unique: true, required: true },
      quantity: { type: Number, min: 0, default: 0 },
      threshold: { type: Number, min: 0, default: 0 },
      consumable: { type: Boolean, default: false },
      venue: Schema.Types.ObjectId,
      archived: { type: Boolean, default: false },
    },
    options,
  ),
);
const Movement = mongoose.model(
  "StockMovement",
  new Schema(
    {
      item: Schema.Types.ObjectId,
      quantity: Number,
      reference: String,
      key: { type: String, unique: true },
      actor: Schema.Types.ObjectId,
    },
    options,
  ),
);
const Allocation = mongoose.model(
  "EventAllocation",
  new Schema(
    {
      booking: { type: Schema.Types.ObjectId, ref: "Booking" },
      item: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
      venue: Schema.Types.ObjectId,
      quantity: Number,
      consumable: Boolean,
      status: {
        type: String,
        enum: ["Active", "Returned", "Consumed"],
        default: "Active",
      },
      key: { type: String, unique: true },
      actor: Schema.Types.ObjectId,
    },
    options,
  ),
);
export async function releaseEventStock(
  booking: any,
  cancelled: boolean,
  actor: any,
  session: any,
) {
  const allocations = await Allocation.find({
    booking,
    status: "Active",
  }).session(session);
  for (const allocation of allocations) {
    const returned = cancelled || !allocation.consumable;
    if (returned)
      await Inventory.updateOne(
        { _id: allocation.item },
        { $inc: { quantity: allocation.quantity } },
        { session },
      );
    await Allocation.updateOne(
      { _id: allocation._id, status: "Active" },
      { $set: { status: returned ? "Returned" : "Consumed" } },
      { session },
    );
    await Audit.create(
      [
        {
          actor,
          action: "allocation." + (returned ? "return" : "consume"),
          target: String(allocation._id),
        },
      ],
      { session },
    );
  }
}
const Supplier = mongoose.model(
  "Supplier",
  new Schema(
    { name: String, contact: String, notes: String, archived: Boolean },
    options,
  ),
);
const Employee = mongoose.model(
  "Employee",
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, unique: true },
      salary: Number,
      availability: String,
      notes: String,
      archived: Boolean,
    },
    options,
  ),
);
const Attendance = mongoose.model(
  "Attendance",
  new Schema(
    {
      employee: Schema.Types.ObjectId,
      date: String,
      present: Boolean,
      key: { type: String, unique: true },
    },
    options,
  ),
);
export const Menu = mongoose.model(
  "CateringMenu",
  new Schema(
    {
      name: String,
      perHead: Number,
      dietary: String,
      items: [String],
      notes: String,
      archived: Boolean,
    },
    options,
  ),
);
const Gallery = mongoose.model(
  "GalleryImage",
  new Schema(
    {
      url: String,
      category: String,
      caption: String,
      provenance: String,
      kind: String,
      poster: String,
      order: Number,
      published: Boolean,
    },
    options,
  ),
);
const Settings = mongoose.model(
  "Settings",
  new Schema(
    { key: { type: String, unique: true }, value: Schema.Types.Mixed },
    options,
  ),
);
const OperationReport = mongoose.model(
  "OperationReport",
  new Schema(
    {
      booking: Schema.Types.ObjectId,
      venue: Schema.Types.ObjectId,
      actor: Schema.Types.ObjectId,
      kind: String,
      details: String,
      createdAt: { type: Date, default: Date.now },
    },
    options,
  ),
);
const SalaryRecord = mongoose.model(
  "SalaryRecord",
  new Schema(
    {
      employee: Schema.Types.ObjectId,
      period: String,
      amount: Number,
      reference: String,
      key: { type: String, unique: true },
      actor: Schema.Types.ObjectId,
    },
    options,
  ),
);
const Review = mongoose.model(
  "Review",
  new Schema(
    {
      booking: { type: Schema.Types.ObjectId, unique: true },
      customer: Schema.Types.ObjectId,
      rating: Number,
      text: String,
      status: { type: String, default: "Pending" },
    },
    options,
  ),
);
const fail = (s: string, n = 400) => Object.assign(new Error(s), { status: n });
const id = z.string().regex(/^[a-f0-9]{24}$/i);
const text = z.string().max(2000);
const amount = z.number().int().min(0).max(1000000000);
const url = z.union([
  z.url().refine((s) => s.startsWith("https://")),
  z.string().regex(new RegExp("^/(api/)?media/[a-zA-Z0-9._-]+$")),
]);
const categories = [
  "Interior",
  "Exterior",
  "Drone View",
  "Barat",
  "Walima",
  "Mehndi",
  "Nikah",
  "Stage Design",
  "Dining",
  "Floral Decor",
  "Lighting",
] as const;
export function operations(app: any, auth: any, roles: any) {
  const admin = roles("Super Admin");
  const configs: [string, any, any][] = [
    [
      "services",
      Service,
      z.object({
        name: z.string().min(2).max(100),
        rate: amount,
        unit: z.enum(["event", "guest"]),
        includedWithPackage: z.boolean().default(false),
        description: text,
        archived: z.boolean(),
      }),
    ],
    [
      "discounts",
      Discount,
      z.object({
        name: z.string().min(2).max(100),
        code: z.string().min(3).max(30),
        amount,
        venue: id,
        expires: z.coerce.date(),
        archived: z.boolean(),
      }),
    ],
    [
      "inventory",
      Inventory,
      z.object({
        name: z.string().min(2).max(100),
        threshold: amount,
        consumable: z.boolean().default(false),
        venue: id,
        archived: z.boolean().default(false),
      }),
    ],
    [
      "suppliers",
      Supplier,
      z.object({
        name: z.string().min(2).max(100),
        contact: text,
        notes: text,
        archived: z.boolean().default(false),
      }),
    ],
    [
      "employees",
      Employee,
      z.object({
        user: id,
        salary: amount,
        availability: text,
        notes: text,
        archived: z.boolean().default(false),
      }),
    ],
    [
      "menus",
      Menu,
      z.object({
        name: z.string().min(2).max(100),
        perHead: amount,
        dietary: text,
        items: z.array(z.string().max(200)).max(100),
        notes: text,
        archived: z.boolean().default(false),
      }),
    ],
    [
      "gallery",
      Gallery,
      z.object({
        url,
        category: z.enum(categories),
        caption: text,
        provenance: z.string().min(5).max(2000),
        kind: z.enum(["image", "video"]),
        poster: z.union([url, z.literal("")]).default(""),
        order: z.number().int().min(0).max(10000),
        published: z.boolean(),
      }),
    ],
  ];
  for (const [path, Model, validator] of configs) {
    app.get("/api/admin/" + path, admin, async (_req: any, res: any) =>
      res.json(await listPage(Model.find().sort({ _id: 1 }), _req)),
    );
    app.post("/api/admin/" + path, admin, async (req: any, res: any) => {
      const r = await Model.create(validator.parse(req.body));
      await Audit.create({
        actor: req.user._id,
        action: path + ".create",
        target: String(r._id),
      });
      res.status(201).json({ data: r });
    });
    app.put(
      "/api/admin/" + path + "/:id",
      admin,
      async (req: any, res: any) => {
        const r = await Model.findByIdAndUpdate(
          id.parse(req.params.id),
          validator.parse(req.body),
          { new: true, runValidators: true },
        );
        if (!r) throw fail("Record not found", 404);
        await Audit.create({
          actor: req.user._id,
          action: path + ".edit",
          target: String(r._id),
        });
        res.json({ data: r });
      },
    );
  }
  const team = roles("Super Admin", "Branch Admin", "Hall Manager");
  const venueScope = (req: any) =>
    req.user.role === "Super Admin" ? {} : { venue: { $in: req.user.venues } };
  app.get("/api/event-inventory", team, async (req: any, res: any) =>
    res.json({
      data: await Inventory.find({
        ...venueScope(req),
        archived: { $ne: true },
      }).sort({ name: 1, _id: 1 }),
    }),
  );
  app.get("/api/allocations", team, async (req: any, res: any) => {
    const filter: any = venueScope(req);
    if (req.query.booking) filter.booking = id.parse(req.query.booking);
    res.json({
      data: await Allocation.find(filter)
        .populate("item", "name")
        .populate("booking", "date slot event status")
        .sort({ createdAt: -1, _id: -1 }),
    });
  });
  app.post("/api/allocations", team, async (req: any, res: any) => {
    const input = z
      .object({
        booking: id,
        item: id,
        quantity: z.number().int().min(1).max(100000),
        key: z.string().uuid(),
      })
      .parse(req.body);
    let result: any;
    await mongoose.connection.transaction(async (session) => {
      const booking = await Booking.findOne({
        _id: input.booking,
        ...venueScope(req),
        status: { $nin: ["Completed", "Cancelled"] },
      }).session(session);
      if (!booking) throw fail("Active assigned booking not found", 404);
      const prior = await Allocation.findOne({ key: input.key }).session(
        session,
      );
      if (prior) {
        if (
          String(prior.booking) !== input.booking ||
          String(prior.item) !== input.item ||
          prior.quantity !== input.quantity
        )
          throw fail("Idempotency conflict", 409);
        result = prior;
        return;
      }
      // Writing the booking serializes allocation against completion/cancellation.
      const locked = await Booking.updateOne(
        { _id: booking._id, status: booking.status },
        { $set: { updatedAt: new Date() } },
        { session },
      );
      if (!locked.matchedCount) throw fail("Booking changed; refresh", 409);
      const item = await Inventory.findOneAndUpdate(
        {
          _id: input.item,
          venue: booking.venue,
          archived: { $ne: true },
          quantity: { $gte: input.quantity },
        },
        { $inc: { quantity: -input.quantity } },
        { session, new: true },
      );
      if (!item)
        throw fail(
          "Insufficient stock or equipment belongs to another palace",
          409,
        );
      [result] = await Allocation.create(
        [
          {
            ...input,
            venue: booking.venue,
            consumable: item.consumable,
            actor: req.user._id,
          },
        ],
        { session },
      );
      await Audit.create(
        [
          {
            actor: req.user._id,
            action: "allocation.create",
            target: String(result._id),
          },
        ],
        { session },
      );
    });
    res.status(201).json({ data: result });
  });
  app.post("/api/allocations/:id/return", team, async (req: any, res: any) => {
    await mongoose.connection.transaction(async (session) => {
      const a = await Allocation.findOne({
        _id: id.parse(req.params.id),
        ...venueScope(req),
      }).session(session);
      if (!a) throw fail("Allocation not found", 404);
      if (a.status !== "Active") return;
      await Inventory.updateOne(
        { _id: a.item },
        { $inc: { quantity: a.quantity } },
        { session },
      );
      await Allocation.updateOne(
        { _id: a._id, status: "Active" },
        { $set: { status: "Returned" } },
        { session },
      );
      await Audit.create(
        [
          {
            actor: req.user._id,
            action: "allocation.return",
            target: String(a._id),
          },
        ],
        { session },
      );
    });
    res.json({ data: true });
  });
  app.post("/api/admin/stock-movements", admin, async (req: any, res: any) => {
    const b = z
      .object({
        item: id,
        quantity: z
          .number()
          .int()
          .min(-100000)
          .max(100000)
          .refine((n) => n !== 0),
        reference: z.string().min(3).max(200),
        key: z.string().uuid(),
      })
      .parse(req.body);
    await mongoose.connection.transaction(async (session) => {
      const prior = await Movement.findOne({ key: b.key }).session(session);
      if (prior) {
        if (String(prior.item) !== b.item || prior.quantity !== b.quantity)
          throw fail("Idempotency conflict", 409);
        return;
      }
      const item = await Inventory.findOneAndUpdate(
        { _id: b.item, quantity: { $gte: Math.max(0, -b.quantity) } },
        { $inc: { quantity: b.quantity } },
        { session, new: true },
      );
      if (!item) throw fail("Insufficient stock or invalid item");
      await Movement.create([{ ...b, actor: req.user._id }], { session });
      await Audit.create(
        [{ actor: req.user._id, action: "stock.move", target: b.item }],
        { session },
      );
    });
    res.json({ data: true });
  });
  app.get("/api/admin/stock-movements", admin, async (_req: any, res: any) =>
    res.json(await listPage(Movement.find().sort({ createdAt: -1 }), _req)),
  );
  app.post("/api/admin/attendance", admin, async (req: any, res: any) => {
    const b = z
      .object({
        employee: id,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        present: z.boolean(),
      })
      .parse(req.body);
    if (!(await Employee.exists({ _id: b.employee, archived: { $ne: true } })))
      throw fail("Active employee not found", 404);
    if (new Date(b.date + "T12:00:00Z").toISOString().slice(0, 10) !== b.date)
      throw fail("Invalid attendance date");
    await Audit.create({
      actor: req.user._id,
      action: "attendance.record",
      target: b.employee,
      metadata: { date: b.date, present: b.present },
    });
    res.json({
      data: await Attendance.findOneAndUpdate(
        { key: b.employee + ":" + b.date },
        { $set: b },
        { upsert: true, new: true },
      ),
    });
  });
  app.get("/api/admin/attendance", admin, async (_req: any, res: any) =>
    res.json({ data: await Attendance.find().sort({ date: -1 }).limit(100) }),
  );
  app.get(
    "/api/operation-reports",
    roles("Super Admin", "Branch Admin", "Hall Manager", "Staff"),
    async (req: any, res: any) => {
      const filter: any =
        req.user.role === "Super Admin"
          ? {}
          : req.user.role === "Staff"
            ? { actor: req.user._id }
            : { venue: { $in: req.user.venues } };
      res.json(
        await listPage(
          OperationReport.find(filter).sort({ createdAt: -1 }),
          req,
        ),
      );
    },
  );
  app.post(
    "/api/operation-reports",
    roles("Super Admin", "Branch Admin", "Hall Manager", "Staff"),
    async (req: any, res: any) => {
      const input = z
        .object({
          booking: id,
          kind: z.enum([
            "Incident",
            "Completion",
            "Kitchen preparation",
            "Equipment readiness",
          ]),
          details: z.string().min(10).max(3000),
        })
        .parse(req.body);
      const booking = await Booking.findById(input.booking);
      if (!booking) throw fail("Booking not found", 404);
      if (req.user.role === "Staff") {
        if (
          !(await Task.exists({
            booking: booking._id,
            assignedTo: req.user._id,
          }))
        )
          throw fail("Access denied", 403);
      } else if (
        req.user.role !== "Super Admin" &&
        !req.user.venues.some((v: any) => String(v) === String(booking.venue))
      )
        throw fail("Access denied", 403);
      res.status(201).json({
        data: await OperationReport.create({
          ...input,
          venue: booking.venue,
          actor: req.user._id,
        }),
      });
    },
  );
  app.get("/api/admin/salaries", admin, async (_req: any, res: any) =>
    res.json(await listPage(SalaryRecord.find().sort({ createdAt: -1 }), _req)),
  );
  app.post("/api/admin/salaries", admin, async (req: any, res: any) => {
    const input = z
      .object({
        employee: id,
        period: z.string().regex(/^\d{4}-\d{2}$/),
        amount: z.number().int().positive().max(1000000000),
        reference: z.string().min(3).max(200),
        key: z.string().uuid(),
      })
      .parse(req.body);
    if (!(await Employee.exists({ _id: input.employee })))
      throw fail("Employee not found", 404);
    const prior = await SalaryRecord.findOne({ key: input.key });
    if (prior) {
      if (
        String(prior.employee) !== input.employee ||
        prior.amount !== input.amount ||
        prior.reference !== input.reference ||
        prior.period !== input.period
      )
        throw fail("Idempotency conflict", 409);
      return res.json({ data: prior });
    }
    res.status(201).json({
      data: await SalaryRecord.create({ ...input, actor: req.user._id }),
    });
  });
  app.get("/api/gallery", async (req: any, res: any) => {
    const category = req.query.category
      ? z.enum(categories).parse(req.query.category)
      : undefined;
    res.json(
      await listPage(
        Gallery.find({
          published: true,
          ...(category ? { category } : {}),
        }).sort({ order: 1, _id: 1 }),
        req,
      ),
    );
  });
  app.get("/api/settings", async (_req: any, res: any) =>
    res.json({
      data: (await Settings.findOne({ key: "public" }))?.value || {
        contactConfigured: false,
      },
    }),
  );
  app.put("/api/admin/settings", admin, async (req: any, res: any) => {
    const value = z
      .object({
        name: z.string().min(2).max(100),
        phone: z.string().max(50),
        address: text,
        whatsapp: z
          .string()
          .regex(/^\d{6,15}$/)
          .or(z.literal("")),
        contactConfigured: z.boolean(),
      })
      .parse(req.body);
    await Settings.updateOne(
      { key: "public" },
      { $set: { value } },
      { upsert: true },
    );
    res.json({ data: true });
  });
  app.post("/api/reviews", roles("Customer"), async (req: any, res: any) => {
    const b = z
      .object({
        booking: id,
        rating: z.number().int().min(1).max(5),
        text: z.string().min(10).max(2000),
      })
      .parse(req.body);
    if (
      !(await Booking.exists({
        _id: b.booking,
        customer: req.user._id,
        status: "Completed",
      }))
    )
      throw fail("A completed booking is required");
    res
      .status(201)
      .json({ data: await Review.create({ ...b, customer: req.user._id }) });
  });
  app.get("/api/reviews", async (_req: any, res: any) =>
    res.json(
      await listPage(
        Review.find({ status: "Approved" })
          .select("rating text createdAt")
          .sort({ createdAt: -1 }),
        _req,
      ),
    ),
  );
  app.get("/api/admin/reviews", admin, async (_req: any, res: any) =>
    res.json(await listPage(Review.find().sort({ createdAt: -1 }), _req)),
  );
  app.patch("/api/admin/reviews/:id", admin, async (req: any, res: any) => {
    await Review.findByIdAndUpdate(id.parse(req.params.id), {
      status: z.enum(["Approved", "Rejected"]).parse(req.body.status),
    });
    res.json({ data: true });
  });
  app.patch("/api/profile", auth, async (req: any, res: any) => {
    const b = z
      .object({
        name: z.string().min(2).max(100),
        savedVenues: z.array(id).max(100),
      })
      .parse(req.body);
    await User.updateOne({ _id: req.user._id }, { $set: b });
    res.json({ data: true });
  });
  app.get("/api/profile", auth, async (req: any, res: any) =>
    res.json({
      data: await User.findById(req.user._id).select("name email savedVenues"),
    }),
  );
  app.post("/api/admin/supplier-payment", admin, async (req: any, res: any) => {
    const b = z
      .object({
        supplier: id,
        amount: z.number().int().positive().max(1000000000),
        reference: z.string().min(3).max(200),
        key: z.string().uuid(),
      })
      .parse(req.body);
    if (!(await Supplier.exists({ _id: b.supplier })))
      throw fail("Supplier unavailable");
    const key = "supplier:" + b.key;
    const existing = await Ledger.findOne({ key });
    if (existing) {
      if (
        existing.reference !== b.supplier + ":" + b.reference ||
        existing.amount !== -b.amount
      )
        throw fail("Idempotency conflict", 409);
      return res.json({ data: existing });
    }
    res.status(201).json({
      data: await Ledger.create({
        type: "Supplier Payment",
        amount: -b.amount,
        reference: b.supplier + ":" + b.reference,
        key,
        actor: req.user._id,
      }),
    });
  });
}
