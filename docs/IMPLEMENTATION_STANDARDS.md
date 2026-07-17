# EduSphere Implementation Standards

## Engineering Principles

- Keep the current stack: React/Vite, Express, PostgreSQL, JWT, and typed TypeScript services.
- Prefer small service classes with clear responsibilities over large route handlers.
- Validate API payloads with Zod before they reach application services.
- Enforce permissions on the backend. Frontend hiding is only a usability layer.
- Keep UI screens minimal, searchable, keyboard-friendly, and purpose-driven.
- Store calculations in database views or backend services when the result affects money, reports, attendance, or compliance.

## Privacy And Safety

- Collect only data needed for school operations.
- Treat student, parent, medical, biometric, academic, and financial records as sensitive.
- Do not store raw biometric templates, plain passwords, provider secrets, or unrelated commercial tracking data.
- Use audit logs for sensitive actions such as fee collection, admissions, health records, attendance alerts, role changes, and report finalization.
- Review retention policies with school leadership before production rollout.

## New Operational Areas

- `super_admin` is the only role that can manage other Super Admin users.
- Admissions are managed through `/students/admissions`.
- Canonical fee payments use `/api/fees/pay`; balances are exposed through `/api/fees/balances`.
- Parent attendance alerts are queued through `/api/biometric/sync`, `/api/attendance/machine`, and `/api/attendance/manual`.
- Communication messages use `/api/communication/send` and are logged in communication history.
- Staff M&E and appraisals are available at `/staff/m-e` and `/staff/appraisal`.

## Verification

Run before release:

```bash
npm run migrate:db
npm run test
npm run lint
npm run build
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`.

The release build writes client assets to `build/client` and the bundled server to
`build/server.cjs`, avoiding Dropbox-managed `dist/` reparse points.
