<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/87afdd10-8a0e-48bf-85ba-87e645c499d2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Cross-Device Authentication

Registration and login use the shared Express authentication API. For a deployed frontend, set the Vercel environment variable `VITE_API_URL` to the public URL of the deployed backend, for example:

`VITE_API_URL=https://your-api.example.com`

Deploy the backend separately with a persistent `DB_PATH` or hosted database. Do not rely on browser local storage for accounts; local storage is only a client-side cache.
