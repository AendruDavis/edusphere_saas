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

The app runs through the Express server in [server.ts](server.ts). API routes use Firebase Admin for trusted writes such as login-account provisioning, ledger transactions, expenses, attendance, GPS updates, and biometric check-ins.

For local backend development, configure Firebase Admin with either Application Default Credentials or the `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` values shown in [.env.example](.env.example). Hardware integration endpoints also require `INTEGRATION_WEBHOOK_SECRET` and expect it in the `x-integration-secret` header.
