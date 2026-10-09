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

## Rechecked 9 October 2026 (Asia/Karachi)

Fresh npm ci completed (401 installed packages; audit reported zero vulnerabilities). Lint, client/server TypeScript, production build, pricing tests 9/9, guest CSV tests 3/3, real MongoDB integration checks 21/21 and isolated browser checks 8/8 passed.

Fixed optional NaN price validation, intermediate integer overflow and exact tax rounding. Currency display now preserves paisa. Default npm test includes CSV tests. Integration startup waits up to 60 seconds and asserts readiness.

Real licensed wedding photography was added to the hero, new demo venue seed, gallery and dining sections. Authenticated admin APIs updated only the running demo venues with the original default image. Desktop and 360px screenshots inspected; four gallery photos loaded and mobile page had no horizontal overflow. Original aerial concept retains its fictional disclosure. Windows asset file replacement exposed a Vite watcher EBUSY crash; frontend was restarted, and Windows polling is now configured. Live API /health returned database connected and frontend returned HTTP 200.

Current session remaining scope is listed in ../REMAINING_WORK.txt; this update does not claim unimplemented gateway/accounting/HR/prerendering features are complete.

Local-test continuation: seed executed twice against each running demo database, retaining exactly four sample bookings and exactly one administrator (the requested owner). Owner login/eye controls and sample bookings in Command center passed Chromium verification. Lint and client/server type checks passed.


Booking-estimate fix (9 October 2026): missing palace/date/valid guest count/collection can no longer bypass wizard checks via Continue or step tabs. Backend invalid palace/collection IDs now return actionable messages. Screenshot scenario with 1000 guests, Lunch, default catering and all three add-ons estimated successfully in Chromium. Regression guards and the complete isolated eight-check browser suite passed; TypeScript, lint and production build passed. Browser QA frontend port defaults to 5175 and can be overridden using QA_WEB_PORT to avoid running demo conflicts.


Full local audit: 40 public and 54 admin desktop/mobile checks reported 0 issues after fixing unauthorized profile queries. 12 unit/CSV, 21 database integration and 9 workflow/regression browser checks passed; lint/typecheck/build passed and npm audit reported 0 vulnerabilities. Duplicate-demo startup guard verified. Full scope and additions: ../WEBSITE_AUDIT.md.


Soundtrack/offer continuation: lint, client/server TypeScript and production build passed. 22 real MongoDB integration checks passed, including automatic zero-price package services, paid extras and duplicate selection rejection. 9 isolated browser checks passed. Music tests using a mocked official player API passed requested video selection, refresh autoplay attempt, pause/play, close cleanup, reopen and mobile sizing. External YouTube playback remains dependent on browser/provider permissions.

Final soundtrack UI: large player panel removed at user request; only a small accessible play/pause icon remains. Refreshed mocked-player tests, lint, TypeScript and production build passed. Git CLI push returned 403 for nouman-nex; the authorized SarimSheikh1 connector is used for publishing.

