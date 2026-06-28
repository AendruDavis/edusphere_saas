# Multi-School Reporting Deployment

## Before Deployment

1. Back up the production PostgreSQL database.
2. Deploy the application code and install dependencies with `npm ci`.
3. Review `.env.example` and configure only the providers that will be enabled.
4. Do not add messaging credentials to source control.

## Database Migration

Run:

```bash
npm run migrate:db
npm run seed:admin
```

The migrations:

- create a default school;
- assign existing users and records to that school;
- add school memberships and tenant ownership;
- preserve existing marks under the percentage assessment policy;
- add reporting, academic policy, invoice, notification and biometric records.

Validate before restarting:

```sql
select count(*) from schools;
select count(*) from school_memberships;
select count(*) from students where "schoolId" is null;
select count(*) from marks where "schoolId" is null;
select count(*) from school_settings where "schoolId" is null;
```

All three null counts must be zero.

## Application Deployment

```bash
npm run test
npm run lint
npm run build
pm2 restart edusphere-saas --update-env
```

Every authenticated school API request now requires `X-School-Id`. The React client sets it automatically after membership discovery.

## Scheduled Jobs

Schedule reminder creation daily at 08:00 Africa/Kampala:

```cron
0 8 * * * cd /var/www/edusphere_saas/edusphere_saas && /usr/bin/npm run jobs:schedule >> /var/log/edusphere-jobs.log 2>&1
```

Process queued notifications every five minutes:

```cron
*/5 * * * * cd /var/www/edusphere_saas/edusphere_saas && /usr/bin/npm run jobs:notifications >> /var/log/edusphere-jobs.log 2>&1
```

## Provider Environment Variables

- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- SMS: `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`, `AFRICASTALKING_SENDER_ID`
- WhatsApp: `ULTRAMSG_INSTANCE_ID`, `ULTRAMSG_TOKEN`
- Hardware integrations: `INTEGRATION_WEBHOOK_SECRET`

Missing provider credentials cause that delivery job to fail safely and retain its error for retry/monitoring.

## Rollback

The migrations are additive and backfill existing data. Do not manually remove tenant columns after production writes begin. Restore the pre-deployment database backup and previous application release if rollback is required.
