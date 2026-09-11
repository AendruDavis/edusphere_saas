# Configuration Verification And Release

## Scope

The focused gate covers settings and branding, accounts and roles, subjects, fee
structures and payments, and fresh/0006-upgrade migrations. It is not a substitute
for the separate six-viewport responsive suite, recovery drills, or school acceptance.

## Isolated Test Database

Use a dedicated PostgreSQL instance/database matching production's **major** version.
Check production with `SHOW server_version;` before declaring a match. Local results
on another major version are useful development evidence, not production parity.

Supply these environment variables through your shell or an untracked local `.env`:

```dotenv
DATABASE_URL=postgresql://APP_USER:APP_PASSWORD@localhost:5432/edusphere
TEST_DATABASE_URL=postgresql://TEST_USER:TEST_PASSWORD@localhost:5432/edusphere_test_config
TEST_POSTGRES_MAJOR=18
TEST_DATABASE_SSL=false
PLAYWRIGHT_CHANNEL=chrome
```

Use your actual production major instead of the example `18`. Create the empty test
database first. Its owner needs schema/extension creation privileges. Prefer a test
role that has no access to production. Do not give test credentials to production.
Install the configured browser on the verification machine, e.g. `npx playwright
install chrome` if Chrome is absent.

The harness refuses missing URLs, application-database aliases, database names
without a separate `test` token, production/live names, URL query options, mismatched
major versions, and nonempty unmarked databases. It marks an initially empty database
as test-owned, holds an exclusive advisory lock, and **resets its public schema/data**.
Never add the ownership marker manually to an application database.

Uploads go into a disposable temporary directory. Messaging/AI credentials are
disabled for test processes; no notification worker is launched. Test accounts use
generated passwords. Browser traces/videos are disabled and screenshots mask password
fields. Test output is ignored by Git. Do not run concurrent suites on the same test
database. The application database and its uploads are not modified.

## Fast Gate

Run one stage at a time, stopping on a nonzero exit status:

```sh
npm ci
npm run lint
npm test
npm run test:config
npm run build
npm run test:smoke
```

`test:config` uses the real Express routes and PostgreSQL, runs fresh and populated
0006 upgrades using the deployment migration runner, and resets fixtures between
workflows. One expected sanitized database error is emitted by the rollback test.

`test:smoke` starts its own production-mode `build/server.cjs` on a free local port.
It never reuses an existing application server or `E2E_BASE_URL`. Four workflows run
at 1440x900 and 360x800, submit through the UI, reload, and verify through real APIs.
Fixtures include 30 long student names and linked family/staff accounts. The first
failure stops the suite; maximum total runtime is five minutes. Screenshots are under
`test-results/configuration-smoke`. Correct a failure, rerun the affected test, then
run the whole focused suite once for release evidence.

Keep `npm run test:responsive` separate. Missing test prerequisites are failures,
never successful skips. Preserve command output, commit identifier, PostgreSQL major,
build artifact checksum, and test reports with the release record.

## Read-Only Preflight

These commands inspect `DATABASE_URL` and the actual upload directory:

```sh
npm run check:config
npm run check:access
```

`check:config` reports migration history, PostgreSQL version, identities, JSON field
shapes, duplicate configurations, memberships, administrators, enforcement mode,
current periods, and missing referenced logo files. Pre-migration duplicates/name
mismatches are reported because 0007 repairs them; post-migration they are failures.
It runs in a read-only transaction. Review warnings as well as the exit status.
`check:access` additionally reports missing parent/student links and teaching scopes.
Audit-mode schools still need an explicit review and enforcement activation.

Migration 0007 keeps the original balance-view columns in their original order and
appends period/credit fields, as required by [PostgreSQL CREATE VIEW](https://www.postgresql.org/docs/current/sql-createview.html).
The configured local database was at 0006 when this correction was made. Check each
deployment's migration ledger first. If 0007 is already recorded, **do not delete
ledger rows or blindly rerun it**. Run the post-check and prepare a new forward
migration for any differences in that installation.

## Production Rollout

1. Schedule a quiet maintenance window and stop application writes/background jobs.
2. Back up PostgreSQL in custom format and the complete `public/uploads` directory
   (or `UPLOAD_ROOT` if overridden), outside any replaced release directory. Keep
   restricted permissions, verify the archive contents, and retain a tested restore
   procedure. A database dump does not include uploaded files.
3. Preserve the previous `build` artifact, PM2 configuration, environment, and release
   identifier. Transfer the verified artifact plus matching migrations/server sources
   and lockfile. Do not replace persistent uploads with files from a build archive.
4. Run preflight against production, review its output, then run:

   ```sh
   npm run migrate:db
   npm run check:config -- --post
   npm run check:access
   ```

5. Confirm current term, academic year, currency, account links, and enforcement mode
   for each school. Resolve nonzero post-check results before reopening writes.
6. Restart the configured process using `build/server.cjs`, not the obsolete
   `dist/server.cjs`. For the supplied PM2 config, use `pm2 startOrReload
   ecosystem.config.cjs --update-env`; inspect `pm2 status` and logs before `pm2 save`.
7. Perform read-only checks through both localhost and the public HTTPS domain:
   `/api/health`, public school branding, authenticated settings/snapshot, subjects,
   access readiness, and current-period balances. Verify the public login HTML
   references the same hashed asset as `build/client/index.html`, and fetch the logo.
   Do not put authentication tokens/passwords in shared logs.
8. Reopen writes only after school sign-off. Keep the previous artifact and backups.

Do not run `test:config` or `test:smoke` against production. If rollback is needed,
stop writes first. Restoring a build alone is not a database rollback; assess schema
compatibility. Restoring a database backup loses changes made after that backup, so
coordinate the recovery point with the school before restoring data and uploads.
