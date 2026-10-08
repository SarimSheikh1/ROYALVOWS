import mongoose, { Schema } from "mongoose";
const opts = { timestamps: true };
const ref = { type: Schema.Types.ObjectId, ref: "User" };
export const User = mongoose.model(
  "User",
  new Schema(
    {
      name: { type: String, required: true },
      email: { type: String, unique: true, required: true },
      password: { type: String, required: true, select: false },
      emailVerified: { type: Boolean, default: false },
      role: {
        type: String,
        enum: [
          "Customer",
          "Super Admin",
          "Branch Admin",
          "Hall Manager",
          "Staff",
        ],
        default: "Customer",
      },
      venues: [Schema.Types.ObjectId],
      savedVenues: [Schema.Types.ObjectId],
    },
    opts,
  ),
);
export const Session = mongoose.model(
  "Session",
  new Schema(
    {
      token: { type: String, unique: true },
      csrf: String,
      user: ref,
      expires: { type: Date, index: { expires: 0 } },
    },
    opts,
  ),
);
export const Venue = mongoose.model(
  "Venue",
  new Schema(
    {
      name: { type: String, unique: true },
      city: String,
      capacity: Number,
      rental: Number,
      outdoor: Boolean,
      description: String,
      amenities: [String],
      image: String,
      demo: { type: Boolean, default: true },
      archived: { type: Boolean, default: false },
      taxBps: { type: Number, default: 0 },
    },
    opts,
  ),
);
export const Package = mongoose.model(
  "Package",
  new Schema(
    {
      name: { type: String, unique: true },
      perHead: Number,
      decor: Number,
      minGuests: Number,
      maxGuests: Number,
      inclusions: [String],
      archived: { type: Boolean, default: false },
    },
    opts,
  ),
);
export const Booking = mongoose.model(
  "Booking",
  new Schema(
    {
      customer: ref,
      venue: { type: Schema.Types.ObjectId, ref: "Venue" },
      date: String,
      slot: String,
      event: String,
      guests: Number,
      theme: String,
      notes: String,
      package: { type: Schema.Types.ObjectId, ref: "Package" },
      snapshot: Schema.Types.Mixed,
      status: {
        type: String,
        enum: [
          "Pending",
          "Awaiting Advance",
          "Confirmed",
          "In Progress",
          "Completed",
          "Cancelled",
        ],
        default: "Pending",
      },
      paid: { type: Number, default: 0 },
      manager: ref,
      checklist: [{ title: String, done: Boolean }],
      guestList: [{ name: String, table: String }],
      timeline: [{ time: String, title: String }],
    },
    opts,
  ),
);
const rs = new Schema(
  {
    venue: Schema.Types.ObjectId,
    date: String,
    slot: String,
    booking: Schema.Types.ObjectId,
    maintenance: Boolean,
  },
  opts,
);
rs.index({ venue: 1, date: 1, slot: 1 }, { unique: true });
export const Reservation = mongoose.model("AvailabilityReservation", rs);
export const Payment = mongoose.model(
  "Payment",
  new Schema(
    {
      booking: Schema.Types.ObjectId,
      customer: ref,
      amount: Number,
      method: String,
      reference: String,
      status: { type: String, default: "Pending" },
      key: { type: String, unique: true },
      approvedBy: ref,
    },
    opts,
  ),
);
export const Ledger = mongoose.model(
  "LedgerEntry",
  new Schema(
    {
      booking: Schema.Types.ObjectId,
      amount: Number,
      type: String,
      key: { type: String, unique: true },
      actor: ref,
      reference: String,
    },
    opts,
  ),
);
export const Audit = mongoose.model(
  "AuditLog",
  new Schema(
    {
      actor: ref,
      action: String,
      target: String,
      metadata: Schema.Types.Mixed,
    },
    opts,
  ),
);
export const Notification = mongoose.model(
  "Notification",
  new Schema(
    { user: ref, message: String, read: { type: Boolean, default: false } },
    opts,
  ),
);
export const Inquiry = mongoose.model(
  "Inquiry",
  new Schema(
    {
      customer: ref,
      name: String,
      email: String,
      message: String,
      status: { type: String, default: "Pending" },
    },
    opts,
  ),
);
const cs = new Schema(
  {
    customer: ref,
    date: String,
    slot: String,
    status: { type: String, default: "Pending" },
    notes: String,
  },
  opts,
);
cs.index({ date: 1, slot: 1 }, { unique: true });
export const Consultation = mongoose.model("Consultation", cs);
export const Task = mongoose.model(
  "Task",
  new Schema(
    {
      booking: Schema.Types.ObjectId,
      venue: Schema.Types.ObjectId,
      assignedTo: ref,
      title: String,
      status: {
        type: String,
        enum: ["To Do", "In Progress", "Done"],
        default: "To Do",
      },
    },
    opts,
  ),
);
export const Expense = mongoose.model(
  "Expense",
  new Schema(
    {
      amount: Number,
      category: String,
      description: String,
      actor: ref,
      key: { type: String, unique: true },
    },
    opts,
  ),
);

export const Counter = mongoose.model(
  "Counter",
  new Schema(
    {
      key: { type: String, unique: true },
      value: { type: Number, default: 0 },
    },
    opts,
  ),
);
export const Invoice = mongoose.model(
  "Invoice",
  new Schema(
    {
      booking: { type: Schema.Types.ObjectId, unique: true },
      number: { type: String, unique: true },
      snapshot: Schema.Types.Mixed,
    },
    opts,
  ),
);
export const Refund = mongoose.model(
  "Refund",
  new Schema(
    {
      booking: Schema.Types.ObjectId,
      payment: Schema.Types.ObjectId,
      amount: Number,
      reference: String,
      key: { type: String, unique: true },
      actor: ref,
    },
    opts,
  ),
);

export const Service = mongoose.model(
  "Service",
  new Schema(
    {
      name: { type: String, unique: true },
      rate: Number,
      unit: { type: String, enum: ["event", "guest"] },
      description: String,
      archived: { type: Boolean, default: false },
    },
    opts,
  ),
);
export const Discount = mongoose.model(
  "Discount",
  new Schema(
    {
      name: String,
      code: { type: String, unique: true },
      amount: Number,
      venue: Schema.Types.ObjectId,
      expires: Date,
      archived: { type: Boolean, default: false },
    },
    opts,
  ),
);
