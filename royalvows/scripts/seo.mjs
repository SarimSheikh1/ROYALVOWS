import fs from "node:fs";
const origin = process.env.SITE_URL;
if (!origin) {
  console.log(
    "SITE_URL absent: sitemap generation skipped for unconfigured demo domain",
  );
  process.exit(0);
}
const url = new URL(origin);
if (url.protocol !== "https:") throw new Error("SITE_URL must use HTTPS");
const paths = [
  "/",
  "/story",
  "/palaces",
  "/collections",
  "/services",
  "/catering",
  "/gallery",
  "/planning",
  "/contact",
  "/privacy",
  "/terms",
];
fs.writeFileSync(
  "client/public/sitemap.xml",
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    paths
      .map((p) => "<url><loc>" + new URL(p, origin).href + "</loc></url>")
      .join("") +
    "</urlset>",
);
