# RoyalVows

RoyalVows combines an original palace website with customer planning, administrative booking/finance tools and scoped hall/staff operations. All bookings, sessions, catalogs and operational records use MongoDB. Venue seed records and generated artwork are explicitly illustrative.

## Windows setup

1. Install Node.js 24, Git, VS Code and Docker Desktop (Linux containers), or use MongoDB Atlas.
2. Open the repository in VS Code. In its PowerShell terminal:

```powershell
cd royalvows
npm ci
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste that privately generated value into SESSION_SECRET in .env. Do not commit .env. Set MONGODB_URI and CLIENT_ORIGIN. The default origin is http://localhost:5173; use that exact hostname to avoid CORS/CSRF rejections.

3. For a persistent local database, start Docker Desktop, then:

```powershell
docker compose up -d
npm run seed
```

The Compose health check initializes rs0. The MongoDB volume persists data. The port is bound to localhost. Multi-document booking, finance and stock transactions require a replica set. A standalone mongod is insufficient. Seed only accepts database names ending in _demo and inserts missing demo records without deleting existing data.

4. Create the first administrator using private values:

```powershell
$env:ADMIN_EMAIL = 'your-private-admin-email'
$env:ADMIN_NAME = 'Your name'
$privatePassword = Read-Host 'Admin password (12+ characters)' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $privatePassword).Password
npm run create-admin
Remove-Item Env:ADMIN_PASSWORD
```

There is no shipped public admin password. Public registration creates Customers only. Staff and hall managers can register accounts and be assigned roles/venues by the Super Admin in Customers & staff. Permission changes revoke existing sessions.

5. Start both applications:

```powershell
npm run dev
```

Frontend: http://localhost:5173. API: http://127.0.0.1:4000/api/health. The frontend development server proxies /api to Express.

## Quick demonstration without Docker

```powershell
npm run demo
Get-Content .runtime/demo-access.txt
```

The launcher downloads MongoDB on first use, starts a temporary real replica set, seeds the eight venues/five collections, creates a randomized demo administrator and launches frontend/API. Registration, transactions and refresh persistence work against that database while running. Data disappears on shutdown; do not use this mode for business records. Ports 4000 and 5173 must be free.

## MongoDB Atlas

Create an Atlas cluster with a database user and a narrowly scoped network access rule. Use its mongodb+srv URI in MONGODB_URI. Use a _demo database only for seeding. Use a separate production database, configure authentic records through the admin catalog, and back up production data. Transactions require a replica-set-capable cluster.

## Booking and money rules

Lunch is 12:00-16:00; Evening is 18:00-23:00. Unique venue/date/slot reservations enforce conflicts atomically inside MongoDB transactions. Pending requests immediately reserve a slot. They do not automatically expire; an administrator must review them or the customer/operator must cancel. Cancellation releases inventory without implying a refund. Rescheduling replaces the reservation transactionally and rolls back on conflict.

Rates and approved price snapshots use integer paisa. Business dates default to Asia/Karachi; VENUE_TIMEZONE configures server validation. The server validates capacity, collection limits, event type, menu, add-ons and venue-specific discount codes. Configured tax is rounded once after discount; demo tax defaults to zero. Frontend totals cannot override server calculations. Catalog edits preserve historical snapshots.

Manual Cash, Bank Transfer, Easypaisa and JazzCash reports require references and Super Admin approval. They are not gateway confirmations. Approvals and separately recorded refunds use transaction-safe ledger entries and idempotency keys. Corrections require new refund/reversal/adjustment records; there is no ledger edit API. Invoice numbers are allocated atomically. Supplier payment postings and expenses are separate; do not enter the same expenditure twice. Reports distinguish booked invoice totals, net collections, receivables and cash less recorded expenses; that last value is not recognized accounting profit.

## Security and providers

Sessions use random tokens hashed with the server secret, HTTP-only cookies, explicit expiry, revocation and CSRF headers plus origin checks. Production cookies are secure. Financial routes are restricted server-side to Super Admin or the record owner; manager responses omit monetary snapshots. Password reset and verification use hashed, expiring, single-use tokens and require SMTP configuration.

Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and EMAIL_FROM only for an authorized provider. Without them password-reset responses remain generic and verification reports that delivery is unconfigured. No real email, SMS, WhatsApp or payment was sent while building/testing this project. Gallery video URLs are optional, muted, inline and preload=none with manual controls; no fake drone video exists.

Local uploads accept verified JPEG, PNG and WebP bytes only, with an 8 MB limit and randomized filenames. They are intended for public venue/gallery media, not private payment evidence. Keep uploads on persistent storage in production, or configure CLOUDINARY_URL for the included Cloudinary image-storage adapter (provider credentials required). Images are decoded, resized and re-encoded to WebP before storage. Executables and SVG uploads are rejected.

Start the deduplicated in-app event reminder worker separately:

```powershell
npm run worker -w server
```

Failed scheduled runs retry at the next interval. Email/SMS delivery is not implied by an in-app notification. Official card/JazzCash/Easypaisa gateways and webhook adapters still require provider-specific implementation and merchant credentials; the current transfer workflow is manual.

## Verification

```powershell
npm run lint
npm run typecheck
npm run build
npm test
npm run test:integration
npx playwright install chromium
npm run test:browser
npm audit --audit-level=high
docker compose config --quiet
```

Integration and browser checks launch isolated real MongoDB replica sets. They do not clear your database and do not send provider messages. Browser screenshots are written under qa/ and excluded from Git. Tests include concurrent bookings, conflict rollback, ownership/branch denial, CSRF, duplicate financial requests, refund totals, stock concurrency and authorized PDF downloads. See FEATURE_STATUS.md for actual executed results and remaining gaps.

## Production hosting

A Vite static frontend host does not host a persistent Express server or MongoDB. Deploy client/dist to a frontend host with SPA fallback. Deploy server/dist to a persistent Node service with NODE_ENV=production, MONGODB_URI, SESSION_SECRET, CLIENT_ORIGIN and optional HOST/PORT. Forward /api on the same public origin to Express, preserve forwarded HTTPS headers, and configure exactly one trusted reverse proxy or adapt that setting to your infrastructure. Run the reminder worker as a separate supervised service. MongoDB must support transactions; uploads require durable storage.

Set SITE_URL to your verified HTTPS domain before building to generate a sitemap. Route titles/descriptions and Open Graph title updates exist; server prerendering is not implemented. Do not index demo legal/property information as authentic venue structured data. Customize Privacy, Terms, operator contact settings, tax jurisdiction, rates, actual venue media and policies before launch.

## Backup and restore

Use MongoDB Database Tools against the actual replica-set/Atlas URI. Put backups outside the repository and protect access. Examples with your configured URI held privately in an environment variable:

```powershell
mongodump --uri $env:MONGODB_URI --out C:\PrivateBackups\RoyalVows
mongorestore --uri $env:MONGODB_URI C:\PrivateBackups\RoyalVows
```

Restore to a separate database first and verify bookings/ledger totals. Do not drop a live database or commit dumps. Establish the backup schedule and recovery plan with your hosting operator.

## Source organization

client/src contains public pages, portal/operations, API/query helpers, calendar, gallery, SEO and styles. server/src contains API/security, schemas, operating resources, providers/worker and pricing logic; scripts contains CLI demonstration and integration/browser checks. Roles/permissions are embedded in users and enforced in middleware. Customers are customer-role Users; venue/branch scopes are embedded venue assignments; media lives in GalleryImage; refund money is separately recorded in Refund and LedgerEntry. This avoids parallel identity/permission collections while retaining historical booking and invoice snapshots. Further component/router extraction can be done without changing persisted records.

See MEDIA.md for provenance and FEATURE_STATUS.md for the requirement checklist. This is a working implementation with explicit remaining limits, not a zero-configuration production deployment.

## Local test workspace

When the private ignored `.runtime/demo-owner.json` owner configuration exists, `npm run demo` restores that owner as the sole administrator and adds clearly named local test data: four bookings in different states, pending/approved payments with matching ledgers and invoices, preparation tasks, an expense, inventory, supplier, inquiry and consultation. Other previous demo administrators become customer accounts, preserving their references. Sample customers and manager accounts use randomized inaccessible passwords; no messages are sent. The seed is idempotent and rejects databases whose names do not end in `_demo`.

The database is still temporary. Samples are recreated on each demo start; edits to business/test records require persistent Docker/Atlas storage to survive shutdown. The privately configured owner password hash is restored on restart and is excluded from Git.

## Wedding soundtrack and complimentary package benefits

The site embeds the requested YouTube video `hghqd1eBTYQ` and attempts playback on each full page open/refresh. Audible autoplay depends on browser permission; a visible Play/Pause button and YouTube controls provide user-initiated playback. The player box stays offscreen; only a small accessible music icon is displayed for pause/play. The soundtrack is streamed through the official YouTube player.

Every active demo collection includes a complimentary sound system and a 10-minute dance. Included services are stored in MongoDB with `includedWithPackage`; the server automatically snapshots them at zero charge, even when not selected as paid add-ons. Paid extras remain chargeable. Historical booking snapshots are preserved. Admin Addons can edit the complimentary inclusion flag. Demo seed reapplies the owner's promotional benefits idempotently.
