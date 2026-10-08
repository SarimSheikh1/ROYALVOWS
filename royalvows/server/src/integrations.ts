import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";
import mongoose, { Schema } from "mongoose";
import { randomBytes, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import bcrypt from "bcrypt";
import { z } from "zod";
import { User, Session, Booking, Notification, Audit } from "./models.js";
const Token = mongoose.model(
  "AccountToken",
  new Schema(
    {
      user: Schema.Types.ObjectId,
      hash: { type: String, unique: true },
      kind: String,
      expires: { type: Date, index: { expires: 0 } },
    },
    { timestamps: true },
  ),
);
const Reminder = mongoose.model(
  "ReminderDelivery",
  new Schema(
    { key: { type: String, unique: true }, booking: Schema.Types.ObjectId },
    { timestamps: true },
  ),
);
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const fail = (s: string, n = 400) => Object.assign(new Error(s), { status: n });
async function sendEmail(to: string, subject: string, text: string) {
  if (!process.env.SMTP_HOST || !process.env.EMAIL_FROM)
    return { configured: false, delivered: false };
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  const result = await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
  });
  return { configured: true, delivered: result.accepted.includes(to) };
}
export function integrations(app: any, auth: any, roles: any, loginLimit: any) {
  const admin = roles("Super Admin");
  app.get("/api/integrations", (_req: any, res: any) =>
    res.json({
      data: {
        emailConfigured: !!(process.env.SMTP_HOST && process.env.EMAIL_FROM),
        payments: "Manual approval only; no live merchant gateway configured",
        storage:
          "Local verified images; configure persistent production storage",
      },
    }),
  );
  app.post(
    "/api/auth/request-reset",
    loginLimit,
    async (req: any, res: any) => {
      const email = z
        .email()
        .transform((s) => s.toLowerCase())
        .parse(req.body.email);
      if (process.env.SMTP_HOST && process.env.EMAIL_FROM) {
        const user = await User.findOne({ email });
        if (user) {
          const raw = randomBytes(32).toString("hex");
          await Token.deleteMany({ user: user._id, kind: "reset" });
          await Token.create({
            user: user._id,
            hash: digest(raw),
            kind: "reset",
            expires: new Date(Date.now() + 1800000),
          });
          try {
            await sendEmail(
              email,
              "Reset your RoyalVows password",
              "Reset link: " +
                process.env.CLIENT_ORIGIN +
                "/reset?token=" +
                raw,
            );
          } catch {
            console.error(
              "Password reset delivery failed; no account details logged",
            );
          }
        }
      }
      res.json({
        data: {
          message:
            "If the account exists and email delivery is configured, reset instructions will be sent.",
        },
      });
    },
  );
  app.post("/api/auth/reset", loginLimit, async (req: any, res: any) => {
    const b = z
      .object({
        token: z.string().regex(/^[a-f0-9]{64}$/),
        password: z.string().min(12).max(128),
      })
      .parse(req.body);
    const password = await bcrypt.hash(b.password, 12);
    await mongoose.connection.transaction(async (session) => {
      const token = await Token.findOneAndDelete(
        { hash: digest(b.token), kind: "reset", expires: { $gt: new Date() } },
        { session },
      );
      if (!token) throw fail("Reset link expired or invalid");
      await User.updateOne(
        { _id: token.user },
        { $set: { password } },
        { session },
      );
      await Session.deleteMany({ user: token.user }, { session });
    });
    res.json({ data: true });
  });
  app.post(
    "/api/auth/request-verification",
    auth,
    loginLimit,
    async (req: any, res: any) => {
      if (!process.env.SMTP_HOST || !process.env.EMAIL_FROM)
        return res
          .status(503)
          .json({ error: { message: "Email delivery is not configured" } });
      const raw = randomBytes(32).toString("hex");
      await Token.deleteMany({ user: req.user._id, kind: "verify" });
      await Token.create({
        user: req.user._id,
        hash: digest(raw),
        kind: "verify",
        expires: new Date(Date.now() + 86400000),
      });
      const delivery = await sendEmail(
        req.user.email,
        "Verify your RoyalVows email",
        "Verification link: " +
          process.env.CLIENT_ORIGIN +
          "/verify?token=" +
          raw,
      );
      res.json({ data: delivery });
    },
  );
  app.post("/api/auth/verify", loginLimit, async (req: any, res: any) => {
    const raw = z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(req.body.token);
    await mongoose.connection.transaction(async (session) => {
      const token = await Token.findOneAndDelete(
        { hash: digest(raw), kind: "verify", expires: { $gt: new Date() } },
        { session },
      );
      if (!token) throw fail("Verification link expired or invalid");
      await User.updateOne(
        { _id: token.user },
        { $set: { emailVerified: true } },
        { session },
      );
    });
    res.json({ data: true });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 0 },
  });
  app.post(
    "/api/admin/uploads",
    admin,
    upload.single("file"),
    async (req: any, res: any) => {
      if (!req.file) throw fail("Select an image");
      const type = await fileTypeFromBuffer(req.file.buffer);
      if (
        !type ||
        !["image/jpeg", "image/png", "image/webp"].includes(type.mime)
      )
        throw fail("Only verified JPEG, PNG and WebP images are allowed");
      const metadata = await sharp(req.file.buffer, {
        limitInputPixels: 20000000,
      }).metadata();
      if (!metadata.width || !metadata.height) throw fail("Invalid image");
      const cleaned = await sharp(req.file.buffer, {
        limitInputPixels: 20000000,
      })
        .rotate()
        .resize({
          width: 2400,
          height: 2400,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
      if (process.env.CLOUDINARY_URL) {
        const uploaded: any = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { resource_type: "image", folder: "royalvows/gallery" },
              (error, result) => (error ? reject(error) : resolve(result)),
            )
            .end(cleaned);
        });
        if (!uploaded?.secure_url)
          throw fail("Storage provider did not confirm upload", 503);
        await Audit.create({
          actor: req.user._id,
          action: "media.upload",
          target: uploaded.public_id,
        });
        return res
          .status(201)
          .json({
            data: {
              url: uploaded.secure_url,
              storage: "Configured Cloudinary storage",
            },
          });
      }
      const dir = path.resolve("uploads");
      await mkdir(dir, { recursive: true });
      const filename = randomBytes(24).toString("hex") + ".webp";
      await writeFile(path.join(dir, filename), cleaned, {
        flag: "wx",
      });
      await Audit.create({
        actor: req.user._id,
        action: "media.upload",
        target: filename,
      });
      res.status(201).json({
        data: {
          url: "/api/media/" + filename,
          storage: "Local development storage",
        },
      });
    },
  );
  app.get("/api/media/:filename", async (req: any, res: any) => {
    const name = z
      .string()
      .regex(/^[a-f0-9]{48}\.(jpg|png|webp)$/)
      .parse(req.params.filename);
    res.set("Cache-Control", "public, max-age=86400");
    res.sendFile(path.resolve("uploads", name));
  });
  app.post("/api/admin/reminders/run", admin, async (_req: any, res: any) => {
    res.json({ data: await reminders() });
  });
}
export async function reminders() {
  const next = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const bookings = await Booking.find({ date: next, status: "Confirmed" });
  let sent = 0;
  for (const booking of bookings) {
    await mongoose.connection.transaction(async (session) => {
      const key = "event-reminder:" + booking._id + ":" + next;
      if (await Reminder.exists({ key }).session(session)) return;
      await Reminder.create([{ key, booking: booking._id }], { session });
      await Notification.create(
        [
          {
            user: booking.customer,
            message:
              "Your celebration is tomorrow. Review your plan and contact your assigned team.",
          },
        ],
        { session },
      );
      sent++;
    });
  }
  return { sent, channel: "in-app", providerDelivery: false };
}
