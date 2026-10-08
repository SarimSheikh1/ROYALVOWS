# Executed verification

Verified on 8 October 2026 (Asia/Karachi) in the Windows workspace.

| Check                         | Result                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| npm run lint                  | Passed with ESLint 10                                                                                                      |
| npm run typecheck             | Client and server passed                                                                                                   |
| npm run build                 | Client production assets and compiled Express server passed; workspaces/reset screens are lazy-loaded                      |
| npm test                      | 6 pricing/rounding/discount/capacity/state tests passed                                                                    |
| npm run test:integration      | 21 checks passed against a real isolated MongoDB 8.0.15 replica set                                                        |
| npm run test:browser          | 8 Chromium checks passed against a real isolated MongoDB/API/Vite stack                                                    |
| npm audit --audit-level=high  | 0 vulnerabilities                                                                                                          |
| docker compose config --quiet | Passed                                                                                                                     |
| npm run demo                  | Executed successfully; eight venue/five collection seed and private randomized administrator created; frontend/API started |
| PDF rendering                 | Actual authenticated API invoice rendered with Poppler, inspected visually; one A4 page with no clipping/overlap           |
| Visual inspection             | Desktop homepage/admin and 360px mobile screenshots inspected; encoding issues corrected                                   |

Integration checks cover atomic concurrent reservations; cross-user invoice/plan denial; signed-cookie tampering; CSRF; registration role escalation; payment retry/approval authorization; concurrent payment approvals; refund totals/retries; PDF bytes/access; cross-branch access; concurrent stock deductions; rescheduling conflict rollback; verified WebP upload/executable rejection; customer stock denial; append-only financial reversal retries; cancellation/rebooking; logout revocation.

Browser checks cover homepage rendering, customer booking and refresh persistence, admin manual-payment approval, booking confirmation/manager assignment, authorized invoice download, scoped manager view, 360px mobile navigation/overflow and absence of JavaScript exceptions. The fixtures contain only randomized test accounts and clearly illustrative media; no test clears the configured business database.

The build emits upstream Zod/Rollup annotation warnings while completing successfully. Poppler emitted optional system-font mapping warnings; the actual invoice rendered cleanly. No live SMTP, Cloudinary, SMS, WhatsApp or merchant gateway was called or claimed verified. SITE_URL is unconfigured, so sitemap generation deliberately skipped instead of inventing a domain. Docker Desktop's daemon was unavailable; Compose syntax was checked, while transaction/API testing used real temporary replica-set processes. GitHub CI is configured; local results above are the evidence for this delivery.

Source ZIP excludes .env, node_modules, upload files, runtime databases/tools, screenshots/test outputs and caches. See FEATURE_STATUS.md for remaining scope limits and configuration needs.

Continuation checks: quoted CSV tests 3/3; integration 21/21 including booking pagination, planner concurrency/cancellation history and event allocation concurrency/retries/cancellation release; browser 8/8; production build, lint and type checks executed successfully. Owner login API returned 200 and Super Admin.
