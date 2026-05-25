<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3a494cf7-f722-4c83-a9d3-0fd4d297b948

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend

The app runs through the Express server in [server.ts](server.ts). The frontend calls backend APIs only; trusted reads and writes go through Supabase Postgres using the service role key, while login uses Supabase Auth.

For local backend development:

1. Create a Supabase project.
2. Run [supabase/migrations/0001_initial_schema.sql](supabase/migrations/0001_initial_schema.sql) in Supabase SQL editor or with the Supabase CLI.
3. Copy [.env.example](.env.example) to `.env` and fill `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
4. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`, then run `npm run seed:admin`.
5. Run `npm run dev` and log in with the seeded admin account.

Hardware integration endpoints also require `INTEGRATION_WEBHOOK_SECRET` and expect it in the `x-integration-secret` header.
