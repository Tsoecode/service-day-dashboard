# Service Day Dashboard (Angular 19)

Front-end only prototype for the corporate CSR "Service Day" case study (employees view/register for NGO
activities; administrators manage NGOs, monitor participation, send notifications and run QR check-in).
No real back-end: an HTTP interceptor simulates a REST API (see *Mock back-end*).

## 1. Install & run
Requirements: **Node.js 20.19+ or 22+** and npm.

```bash
npm install            # installs Angular + the `qrcode` package
npm start              # dev server -> http://localhost:4200
npm run build          # production build in dist/
```
(`npm start` = `ng serve`.) Initial JS payload is ~113 kB gzip; admin/employee/auth modules are lazy-loaded.

## 2. Demo accounts
| Role | Email | Password |
|---|---|---|
| Employee | employee@company.com | employee123 |
| Administrator | admin@company.com | admin123 |

The login page has tap-to-fill buttons. Data is stored in browser `localStorage`; Admin Dashboard → **Reset demo data**
re-seeds from `public/data/*.json`. Open a second tab to see live (cross-tab) slot updates.

## 3. Architecture (MVC in Angular)
| MVC | Where |
|---|---|
| **Model** | `src/app/core/models/` – `User`, `Activity` (NGO activity), `Registration`, `AppNotification`, `ReminderSettings` + pure helpers (`getStatus`, `slotsLeft`, `timeUntil`) |
| **View** | `*.component.html` + `.scss` – presentation only (semantic HTML, Flexbox/Grid, box-model spacing, responsive) |
| **Controller** | `*.component.ts` – lean: gather streams (`combineLatest`), call services, handle UI state |
| Data layer | `src/app/core/services/` – `HttpClient` services (Activity, Registration, Notification, CheckIn, Auth, User) |

Modules
- `CoreModule` (service module, imported once): HttpClient, interceptors, all singleton services.
- `SharedModule`: icon, stat-card, bar/donut charts, modal, toast, status badge, activity card, `timeUntil` pipe.
- `LayoutModule`: shell (sidebar, top bar, search).
- Lazy feature modules: `AuthModule`, `EmployeeModule`, `AdminModule` (guards: `authGuard`, `roleGuard`, `guestGuard`).

## 4. Mock back-end (async / AJAX requirement)
- `core/mock/mock-backend.service.ts` loads seed JSON via `HttpClient` (`public/data/*.json`), then serves
  `GET/POST/PUT/DELETE /api/**` with 200–450 ms latency and real status codes (400/401/403/404/409).
- Business rules enforced "server-side": slot capacity (no overbooking), registration cut-off, edit/cancel only until
  cut-off, one-at-a-time time-overlap prevention, check-in window (1 h before start → end), duplicate check-in.
- Pages update **without reload**: `SyncService` re-fetches every 5 s, after every mutation, and on cross-tab changes.
- Scheduler simulation: reminders at 1 week / 3 days / 1 day (configurable) and automatic "last slots" urgent alerts.

## 5. Use-case coverage
| Use case | Implementation |
|---|---|
| 1 Manage NGO availability (admin) | Admin → Manage NGOs: list, add, edit, remove (date, time, service type, location, description, max employees, cut-off); validated form; registrants notified |
| 2 View opportunities (employee) | Employee → Dashboard & Opportunities: NGO, description, schedule, location, slots, cut-off countdown; filter + search |
| 3 Register / edit / cancel | Confirm modal; Change activity (atomic slot move) and Withdraw until cut-off; full/closed blocked |
| 4 Monitor participation (admin) | Admin → Dashboard & Participation: offered/taken/remaining, per-NGO registrants, department distribution, manual reminders |
| 5 Notifications & reminders | Admin → Notifications: reminder schedule (1w/3d/1d, add/remove/edit), broadcast (announcement/reminder/urgent), log incl. NGO messages; Employee notification centre with unread badge |
| 6 QR check-in | Admin generates/regenerates/downloads QR; employee scans (camera via `BarcodeDetector` where supported) or enters code / opens link; arrival time recorded; live attendance + per-activity report + CSV export |

## 6. Packages (NPM)
`@angular/*` (framework, router, forms, HttpClient), `rxjs` (async streams), `qrcode` (QR generation, lazy-loaded
only on the admin check-in page). No UI/CSS framework or icon font is used, to keep the app light.

## 7. Notes / assumptions
- The brief title says BIT306 while files are BIT210; confirm the code with your lecturer.
- An employee may join several activities, but **overlapping times are rejected** (the case study only says
  "changing to another activity", so this is a documented assumption).
- Login social buttons / register link from the reference image were omitted: not in the requirements.
- The QR code encodes `/employee/check-in?code=…`; because the mock database lives in one browser, scan it in the
  same browser (or type the code). A real back-end would remove this limitation.
- Cut-off/start dates in the seed JSON are relative to first load so the demo always has open, closing, ongoing and past activities.
- Passwords are plain text in mock JSON – acceptable for a prototype only.
