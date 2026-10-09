import { MongoMemoryReplSet } from "mongodb-memory-server";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
async function assertPortAvailable(port: number) {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () => reject(new Error(`Port ${port} is already in use. Open the existing RoyalVows session or stop it before starting another demo.`)));
    probe.listen(port, "127.0.0.1", () => probe.close((error) => error ? reject(error) : resolve()));
  });
}
await Promise.all([assertPortAvailable(4000), assertPortAvailable(5173)]);
const db = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
  binary: { version: "8.0.15" },
});
const password = randomBytes(24).toString("base64url");
const env = {
  ...process.env,
  MONGODB_URI: db.getUri("royalvows_demo"),
  SESSION_SECRET: randomBytes(48).toString("hex"),
  CLIENT_ORIGIN: "http://localhost:5173",
  PORT: "4000",
  ADMIN_EMAIL: "admin@royalvows.demo",
  ADMIN_NAME: "Demo Administrator",
  ADMIN_PASSWORD: password,
  SMTP_HOST: "",
  CLOUDINARY_URL: "",
  NODE_ENV: "development",
};
const children: any[] = [];
async function cli(mode: string) {
  await new Promise<void>((resolve, reject) => {
    const c = spawn(
      process.execPath,
      ["--import", "tsx", "server/src/cli.ts", mode],
      { env, stdio: "inherit" },
    );
    c.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error("Demo setup failed")),
    );
  });
}
await cli("seed");
let ownerEmail = "";
try {
  const owner = JSON.parse(await readFile(".runtime/demo-owner.json", "utf8"));
  const { default: mongoose } = await import("mongoose");
  const { User } = await import("../server/src/models.js");
  await mongoose.connect(env.MONGODB_URI);
  await User.updateOne(
    { email: owner.email },
    {
      $set: {
        email: owner.email,
        name: owner.name,
        password: owner.password,
        role: "Super Admin",
      },
    },
    { upsert: true },
  );
  ownerEmail = owner.email;
  const { seedTestData } = await import("../server/src/test-data.js");
  await seedTestData(owner.email);
  await mongoose.disconnect();
} catch (error: any) {
  if (error.code !== "ENOENT") throw error;
  await cli("admin");
}

await mkdir(".runtime", { recursive: true });
await writeFile(
  ".runtime/demo-access.txt",
  "TEMPORARY REAL MONGODB DEMO. Data is removed when demo stops.\nURL: http://localhost:5173\nAdmin: " +
    (ownerEmail || env.ADMIN_EMAIL) +
    "\nPassword: " +
    (ownerEmail ? "Use your configured owner password" : password) +
    "\nRegister customer accounts through the website.\n",
);
children.push(
  spawn(
    process.execPath,
    ["--watch", "--import", "tsx", "server/src/index.ts"],
    {
      env,
      stdio: "inherit",
    },
  ),
);
children.push(
  spawn(
    process.execPath,
    ["../node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
    { env, cwd: process.cwd() + "/client", stdio: "inherit" },
  ),
);
console.log(
  "Temporary real MongoDB demo: http://localhost:5173. Private admin access details are in .runtime/demo-access.txt. Data disappears when stopped.",
);
async function stop() {
  for (const c of children) c.kill();
  await db.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
