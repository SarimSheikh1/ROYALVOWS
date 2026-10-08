import { Menu } from "./operations.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { User, Venue, Package, Service } from "./models.js";
if (!process.env.MONGODB_URI) throw new Error("Configure MONGODB_URI");
await mongoose.connect(process.env.MONGODB_URI);
try {
  if (process.argv[2] === "seed") {
    if (!mongoose.connection.name.endsWith("_demo"))
      throw new Error("Seed requires a database ending in _demo");
    const names = [
      "Imperial Grand Ballroom",
      "Emerald Palace",
      "Royal Orchid Marquee",
      "Sapphire Banquet",
      "Golden Crown Hall",
      "Moonlight Garden",
      "Platinum Pavilion",
      "Pearl Wedding Palace",
    ];
    for (const [i, name] of names.entries())
      await Venue.updateOne(
        { name },
        {
          $setOnInsert: {
            name,
            city: "Demo City",
            capacity: 300 + i * 100,
            rental: (150000 + i * 25000) * 100,
            outdoor: i === 5 || i === 2,
            description:
              "An illustrative palace collection with elegant arrival spaces, refined dining and a dedicated celebration team. Demo venue | location and licensed venue media require configuration.",
            amenities: [
              "Bridal suite",
              "Groom suite",
              "Parking planning",
              "Accessible entry",
              "Climate control",
            ],
            image:
              "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=85",
            taxBps: 0,
            demo: true,
          },
        },
        { upsert: true },
      );
    for (const [i, name] of [
      "Pearl",
      "Golden Legacy",
      "Imperial Signature",
      "Royal Diamond",
      "Majestic Bespoke",
    ].entries())
      await Package.updateOne(
        { name },
        {
          $setOnInsert: {
            name,
            perHead: (2500 + i * 1000) * 100,
            decor: (50000 + i * 35000) * 100,
            minGuests: 50,
            maxGuests: 1500,
            inclusions: [
              "Venue coordination",
              "Signature dining",
              "Theme styling",
              "Wedding-day support",
            ],
          },
        },
        { upsert: true },
      );
    for (const [name, rate] of [
      ["Signature photography", 15000000],
      ["Ambient lighting", 5000000],
      ["Live sound coordination", 3500000],
    ] as const)
      await Service.updateOne(
        { name },
        {
          $setOnInsert: {
            name,
            rate,
            unit: "event",
            description: "Demo service rate; confirm scope with your planner",
            archived: false,
          },
        },
        { upsert: true },
      );
    for (const [name, perHead] of [
      ["Pearl dining", 250000],
      ["Royal feast", 350000],
      ["Garden vegetarian", 220000],
    ] as const)
      await Menu.updateOne(
        { name },
        {
          $setOnInsert: {
            name,
            perHead,
            dietary: "Confirm dietary requirements during consultation",
            items: ["Sample menu awaiting operator curation"],
            notes: "Demo menu",
            archived: false,
          },
        },
        { upsert: true },
      );
    console.log("Demo catalog seeded without clearing records");
  } else if (process.argv[2] === "admin") {
    const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
    if (
      !ADMIN_EMAIL ||
      !ADMIN_PASSWORD ||
      ADMIN_PASSWORD.length < 12 ||
      !ADMIN_NAME
    )
      throw new Error(
        "Supply ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD (12+ characters) privately through environment variables",
      );
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase(),
      password: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: "Super Admin",
    });
    console.log("Admin created");
  } else throw new Error("Use seed or admin");
} finally {
  await mongoose.disconnect();
}
