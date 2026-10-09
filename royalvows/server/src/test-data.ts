import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { User, Session, Venue, Package, Booking, Reservation, Payment, Ledger, Counter, Invoice, Task, Expense, Inquiry, Consultation, Audit } from "./models.js";
import "./operations.js";
import { price } from "./pricing.js";
export async function seedTestData(ownerEmail: string) {
  if (!mongoose.connection.name.endsWith("_demo")) throw new Error("Test samples require a _demo database");
  const owner = await User.findOne({ email: ownerEmail, role: "Super Admin" });
  if (!owner) throw new Error("Configure the requested local owner before adding test data");
  const otherAdmins = await User.find({ _id: { $ne: owner._id }, role: { $in: ["Super Admin", "Branch Admin"] } });
  await User.updateMany({ _id: { $in: otherAdmins.map(u => u._id) } }, { $set: { role: "Customer", venues: [] } });
  await Session.deleteMany({ user: { $in: otherAdmins.map(u => u._id) } });
  const venues = await Venue.find({ demo: true, archived: false }).sort({ name: 1 });
  const packs = await Package.find({ archived: false }).sort({ perHead: 1 });
  if (venues.length < 4 || !packs.length) throw new Error("Run demo catalog seed first");
  const samplePassword = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  const team = await User.findOneAndUpdate({ email: "manager.local-test@example.test" }, { $setOnInsert: { name: "Demo Hall Manager", email: "manager.local-test@example.test", password: samplePassword, role: "Hall Manager", venues: venues.map(v => v._id) } }, { upsert: true, new: true });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const dateAt = (offset: number) => { const d = new Date(today + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
  const statuses = ["Pending", "Awaiting Advance", "Confirmed", "Completed"];
  for (let i = 0; i < 4; i++) {
    const customer = await User.findOneAndUpdate({ email: `customer${i + 1}.local-test@example.test` }, { $setOnInsert: { name: ["Demo Ayesha & Hamza", "Demo Zain & Noor", "Demo Ali & Sara", "Demo Hira & Bilal"][i], email: `customer${i + 1}.local-test@example.test`, role: "Customer", password: samplePassword } }, { upsert: true, new: true });
    const marker = `LOCAL TEST SAMPLE ${i + 1}`;
    if (await Booking.exists({ notes: marker })) continue;
    const venue = venues[i]; const pack = packs[Math.min(i, packs.length - 1)];
    const guests = Math.min(venue.capacity!, pack.maxGuests!, 150 + i * 50);
    const date = dateAt([7, 14, 21, -7][i]); const slot = i % 2 ? "Lunch" : "Evening";
    const snapshot = { ...price(venue as any, pack as any, guests), venueName: venue.name, menu: "Collection menu", addonItems: [], date, slot, theme: "Royal Gold" };
    const paid = i === 2 ? Math.round(snapshot.total / 4) : i === 3 ? snapshot.total : 0;
    await mongoose.connection.transaction(async session => {
      if (await Booking.exists({ notes: marker }).session(session)) return;
      const [booking] = await Booking.create([{ customer: customer._id, venue: venue._id, package: pack._id, date, slot, event: ["Barat", "Walima", "Mehndi", "Nikah"][i], guests, theme: "Royal Gold", notes: marker, snapshot, status: statuses[i], paid, manager: i >= 2 ? team._id : undefined, checklist: [{ title: "Demo: finalize guest count", done: false }], timeline: [{ time: "18:00", title: "Demo: guest arrival" }] }], { session });
      if (statuses[i] !== "Completed") await Reservation.create([{ venue: venue._id, date, slot, booking: booking._id }], { session });
      const counter = await Counter.findOneAndUpdate({ key: "invoice" }, { $inc: { value: 1 } }, { upsert: true, new: true, session });
      await Invoice.create([{ booking: booking._id, number: "RV-" + String(counter!.value).padStart(8, "0"), snapshot }], { session });
      if (i >= 1) {
        const amount = paid || Math.round(snapshot.total / 5);
        const [payment] = await Payment.create([{ booking: booking._id, customer: customer._id, amount, method: i === 3 ? "Cash" : "Bank Transfer", reference: marker + " - fictional payment", key: "local-test-payment:" + (i + 1), status: paid ? "Approved" : "Pending", approvedBy: paid ? owner._id : undefined }], { session });
        if (paid) await Ledger.create([{ booking: booking._id, amount, type: "Payment", key: "payment:" + payment._id, reference: marker, actor: owner._id }], { session });
      }
      await Task.create([{ booking: booking._id, venue: venue._id, assignedTo: team._id, title: marker + ": prepare stage and catering", status: i === 3 ? "Done" : "To Do" }], { session });
      await Audit.create([{ actor: owner._id, action: "local-test.seed", target: String(booking._id), metadata: { demo: true } }], { session });
    });
  }
  await Expense.updateOne({ key: "local-test-expense:1" }, { $setOnInsert: { amount: 2500000, category: "Decoration", description: "LOCAL TEST SAMPLE: fictional floral supplies", actor: owner._id, key: "local-test-expense:1" } }, { upsert: true });
  await Inquiry.updateOne({ email: "inquiry.local-test@example.test" }, { $setOnInsert: { name: "Demo private tour request", email: "inquiry.local-test@example.test", message: "LOCAL TEST SAMPLE: request a venue viewing", status: "Pending" } }, { upsert: true });
  const customer = await User.findOne({ email: "customer1.local-test@example.test" });
  await Consultation.updateOne({ notes: "LOCAL TEST SAMPLE: planning consultation" }, { $setOnInsert: { customer: customer!._id, planner: team._id, date: dateAt(3), slot: "10:00", status: "Pending", notes: "LOCAL TEST SAMPLE: planning consultation" } }, { upsert: true });
  const Inventory = mongoose.model("InventoryItem");
  for (const [name, quantity, threshold] of [["Demo banquet chairs", 600, 50], ["Demo dining tables", 60, 10], ["Demo floral stands", 8, 10]] as const) await Inventory.updateOne({ name }, { $setOnInsert: { name, quantity, threshold, venue: venues[0]._id, consumable: false, archived: false } }, { upsert: true });
  await mongoose.model("Supplier").updateOne({ name: "Demo Floral Supplier" }, { $setOnInsert: { name: "Demo Floral Supplier", contact: "Local test record - no real contact", notes: "LOCAL TEST SAMPLE", archived: false } }, { upsert: true });
  console.log("Local test data ready: 4 sample bookings, 3 payments, tasks, consultation, inquiry, inventory and expense. The configured owner is the only administrator.");
}