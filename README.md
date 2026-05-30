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

The app runs through the Express server in [server.ts](server.ts). The frontend calls backend APIs only; trusted reads and writes go through direct PostgreSQL repositories, while login uses backend-owned users, password hashes, roles, and signed session tokens.

For local backend development:

1. Install PostgreSQL locally and create a database, for example `edusphere_saas`.
2. Copy [.env.example](.env.example) to `.env` and fill `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`.
3. Run `npm run migrate:db`.
4. Run `npm run seed:admin`.
5. Run `npm run dev` and log in with the seeded admin account.

Hardware integration endpoints also require `INTEGRATION_WEBHOOK_SECRET` and expect it in the `x-integration-secret` header.
