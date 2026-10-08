# RoyalVows requirement and verification status

Working source is implemented and committed in phases. The application is not represented as a deployed, fully configured production business. This checklist distinguishes code, executed checks and remaining limits.

## Implemented

| Area               | Working implementation                                                                                                                                                                                                                                   | Verification                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Foundation         | npm workspaces, React/Vite/TypeScript/Tailwind, Express/Mongoose, replica-set Compose, environment validation and lockfile                                                                                                                               | Type checks, builds, lint; Compose configuration validation                                         |
| Identity           | Customer-only registration, bcrypt, signed HTTP-only session cookies, expiry/revocation, origin/CSRF checks, rate/request-size limits, scoped roles                                                                                                      | Real database authentication, tampered-cookie, CSRF, logout and ownership/branch denial tests       |
| Public experience  | Home, Story, Palaces/detail, Collections, Services, Catering, Gallery, Planning, Contact, Privacy and Terms; original RV monogram, responsive luxury styling                                                                                             | Desktop/360px browser QA and screenshots inspected                                                  |
| Catalog            | Eight seeded demo venues, five collections; editable venue/rate/menu/add-on/discount catalogs; search, capacity/city/rental/setting/occasion/facility filters                                                                                            | Database/API use, quote tests and browser booking flow                                              |
| Aerial/media       | Original labeled aerial concept, licensed atmosphere imagery, database gallery metadata, filtering, keyboard lightbox/zoom, video controls/poster/no autoplay downloads                                                                                  | Generated artwork and browser rendering inspected; verified local upload/re-encoding test           |
| Booking            | Authoritative rates, per-head menu, decor, add-ons, venue-specific discounts/configured tax; snapshots; atomic fixed-slot reservation; permitted states; cancellation/rescheduling/maintenance                                                           | Concurrent requests, cancellation/rebooking and conflict rollback tested against a real replica set |
| Customer           | Own bookings, status, invoices, receipts, manual payment reports, ledger, saved palaces/profile, checklist/notes/guests/table assignments/timeline, validated simple CSV import/export, inquiries/consultations, notifications, eligible reviews         | Booking, payment, refresh persistence, invoice, ownership denial and API checks                     |
| Admin/manager      | Scoped bookings, approval/status changes, named manager/staff assignments, month/week/day calendar/filter/details, task board, inventory/suppliers/employees/menus/gallery/review/settings resources, audit records                                      | Browser approval/assignment and scoped manager view; database scope/stock tests                     |
| Staff operations   | Assigned task board; scoped preparation, equipment, kitchen, incident/completion report APIs; attendance and immutable salary record APIs                                                                                                                | Type checks; task/report workflows not all covered by end-to-end tests                              |
| Finance            | Approval-controlled Cash/Bank Transfer/Easypaisa/JazzCash reports, transaction/idempotency-safe ledger/refunds, supplier postings/expenses, reversal records, atomic invoice numbering, authorized A4 PDF and receipts, date-range totals and ledger CSV | Duplicate approvals/refunds/reversals, balances and authorized PDF checked against real MongoDB     |
| Providers/security | Verified limited raster uploads with WebP sanitization, local/Cloudinary storage adapter, hashed expiring single-use reset/verification tokens, SMTP adapter; deduplicated in-app reminder worker                                                        | Local upload/auth tested; live SMTP/Cloudinary not configured or called                             |
| Setup/delivery     | Windows guide, explicit demo seed safety, private first-admin CLI, randomized temporary real-Mongo demo, Atlas/deployment/backup instructions, repeatable CI, source ZIP                                                                                 | Demo launcher and seed executed; ZIP content checked before delivery                                |

## Configuration required

- Persistent MongoDB replica set or Atlas, private session secret and first-admin credentials.
- Real operator contacts, verified venue addresses, capacities, floor plans, rates, jurisdictions/taxes, policies and legal notices. Demo prices are not production rates.
- Actual permissioned venue media and drone video where desired. The original concept is not a real drone photograph. Additional authentic viewpoints await media configuration.
- Authorized SMTP credentials for reset/verification delivery. Cloudinary credentials or durable local upload storage for production. No provider messages/uploads were sent during verification.
- Official merchant integration if online card/gateway payments are desired. The current supported workflow is manual approval; no browser callback can approve a payment. Provider-specific gateway/webhook implementation and credentials are still required.
- Verified HTTPS SITE_URL for sitemap generation, persistent frontend/API hosting, same-origin /api proxy, background worker supervision and production backup schedule. The website has not been deployed.

## Current limits

- Pending requests hold fixed Lunch/Evening slots until reviewed or cancelled, with no automatic expiry. Variable overlapping-duration reservations are not supported.
- Bookings expose a page parameter with 50 records per page; most secondary lists are capped at 100/200 records. Full pagination controls and exhaustive list/filter/report coverage remain to be extended for high-volume businesses. Calendar operates on the returned booking page.
- Reports provide net collections, booked totals, receivables and recorded expenses/supplier outflow. Accrual revenue recognition, complete branch-profitability dashboards, budgeted catering costs and a comprehensive accounting model are not implemented. Cash less expenses is explicitly not labeled recognized profit.
- Catalog item choices and requirements are captured in the configurator. Bespoke decor beyond collection rates, dynamic seating floor-plan drag/drop, full catering procurement/schedules, stock allocations automatically linked to event completion and automatic payroll are not implemented.
- Salary/attendance and operations reports have APIs/basic operational forms rather than a complete HR suite. Staff financial access is restricted by backend roles; arbitrary per-user finance permission customization is not implemented.
- Consultations use globally unique fixed appointment slots with staff confirmation; multi-planner scheduling and detailed consultation-history tooling are limited.
- Public SEO is client route metadata plus configurable sitemap/robots; SSR/prerendering and authentic venue structured data are not implemented. Terms/Privacy remain clearly marked drafts.
- Simple guest CSV supports two unquoted columns (name,table). Imports containing embedded commas or multiline fields are rejected explicitly.

## Actual checks

Final results are recorded in VERIFICATION.md after the last executed checks. Never interpret a checklist entry as a claim that an unconfigured external provider was tested.
