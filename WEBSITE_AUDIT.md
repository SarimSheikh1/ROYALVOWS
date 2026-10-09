# RoyalVows full local website audit

Date: 9 October 2026 (Asia/Karachi).

## Result

Tested local website mein fixes ke baad koi observed runtime error, broken image, invalid collected internal link, unexpected failed HTTP response ya horizontal page overflow nahin mila. Yeh tested scope ka result hai; har possible input/provider/production condition ka guarantee nahin.

| Executed check | Result |
| --- | --- |
| Public pages: 12 routes + 8 venue detail pages, desktop 1440px and mobile 360px | 40 checks, 0 reported issues |
| Admin Command Center: 27 tabs, desktop and mobile | 54 checks, 0 reported issues |
| Unit tests: pricing | 9 passed |
| Guest CSV parsing/export | 3 passed |
| Real isolated MongoDB integration | 21 passed |
| Isolated browser workflows and profile-request regression | 9 passed |
| ESLint, frontend/server TypeScript, production build | Passed |
| npm audit --audit-level=high | 0 known vulnerabilities reported |
| Duplicate demo startup guard | Passed; running session preserved |

Public coverage: Home, Story, Palaces, Collections, Services, Catering, Gallery, Planning, Contact, Privacy, Terms, Login and all eight demo palace details. Checked headings, render failures, image loads, collected internal navigation, page overflow and visible errors.

Admin coverage: Overview, Bookings, Calendar, Tasks, Operations reports, Event timeline, Event equipment, Consultations, Venues, Collections, Customers & staff, Payments, Ledger, Expenses, Reports, Inquiries, Inventory, Suppliers, Employees, Menus, Addons, Discounts, Gallery, Reviews, Settings, Audit logs, Notifications. Tab audit was read-only; it did not exercise every possible create/edit form submission.

Workflow tests cover customer booking and refresh persistence, admin payment approval, booking confirmation/manager assignment, invoice download, scoped manager access, mobile navigation, missing-collection validation and no browser JavaScript exceptions. Database tests also cover concurrency, payment/refund retries, ledger balances, stock, rescheduling, ownership, CSRF and logout.

## Fixed during this audit

1. Public palace pages were requesting the private /api/profile endpoint before customer login, causing repeated 401 responses. Profile query now runs only for a logged-in customer. A browser regression test verifies no profile request is made anonymously.
2. Starting another demo could fall back to frontend port 5174 while the configured cookie/CORS origin was localhost:5173. Demo startup now checks ports 4000/5173 before allocating a database and uses strict frontend port selection.

Browser reports: royalvows/qa/site-audit.json and royalvows/qa/admin-audit.json. Screenshots are in royalvows/qa/. Generated QA data is excluded from Git.

## Sab se pehle kya add/configure karein

1. Permanent local MongoDB replica set / Atlas and backup schedule. Current npm run demo data temporary hai; shutdown par edits lose ho sakti hain. Sample records next startup par recreate hote hain.
2. Real venue contacts, addresses, approved prices/taxes, floor plans, operator policies and final Privacy/Terms. Current catalog illustrative hai.
3. Expiring pending-booking holds plus clear countdown and automatic slot release. Abhi pending slot review/cancellation tak held rehta hai.
4. Official merchant payment gateway and signed, idempotent webhook processing. Current Cash/Bank/Easypaisa/JazzCash reports manual approval workflow hain.
5. Authorized SMTP for reset/verification and confirmations; provider-backed SMS/WhatsApp reminders when configured. In-app notifications/reminder worker already exist.
6. Branch profitability, catering cost budgets, recognized revenue and accounting reports. Current reports collections, bookings, receivables and recorded expenses cover karte hain.

## Additional product features

- Guest RSVP links, digital invitations and QR check-in. Guest CSV and seating layout already exist.
- Urdu/English language switch for customer and staff screens.
- Configurable consultation-slot editor and planner availability calendar.
- Flexible event durations and overlap-safe reservations beyond fixed Lunch/Evening slots.
- Full kitchen preparation/procurement scheduling and custom decor rate catalog.
- Payroll automation and per-user financial permission controls. Basic salary/attendance interfaces already exist.
- Search/filter/page controls for large secondary admin lists.
- SSR/prerendered public pages and verified venue structured data. Existing metadata/sitemap need a real HTTPS SITE_URL.
- Authentic venue drone footage and more genuine media viewpoints. Uploadable video metadata/controls already exist; current aerial image is disclosed concept art.
- Owner-supplied branded invoice terms and receipts emailed via an authorized provider. PDF download already works.
- Optional appearance preference / dark mode and a more compact mobile admin menu.

## Scope limits

No real payment, SMTP, SMS/WhatsApp or Cloudinary delivery was executed. Production hosting, real venue information, backups and real gateway adapters are unconfigured. Sitemap generation skipped because SITE_URL is absent. Full accounting, flexible-duration booking and several HR/procurement features remain development scope as listed in FEATURE_STATUS.md.

## Repeat the read-only page audit

Start the website, then run npm run test:site in royalvows. Public routes are checked by default. Supply private AUDIT_EMAIL and AUDIT_PASSWORD environment variables to include authenticated admin tabs. AUDIT_ORIGIN can point to the correct local website. The test does not publish or send provider messages.