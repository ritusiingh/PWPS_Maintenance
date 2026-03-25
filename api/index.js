// Vercel Serverless Function Entry Point
const path = require('path');

let app;
let initPromise;
let initError;

async function ensureInit() {
  // If previous init failed, reset and retry
  if (initError) {
    initPromise = null;
    initError = null;
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        // Load dotenv for local dev (no-op on Vercel since env vars are injected)
        require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

        console.log('[VERCEL] Initializing...');
        console.log('[VERCEL] TURSO_DATABASE_URL set:', !!process.env.TURSO_DATABASE_URL);
        console.log('[VERCEL] TURSO_AUTH_TOKEN set:', !!process.env.TURSO_AUTH_TOKEN);
        console.log('[VERCEL] JWT_SECRET set:', !!process.env.JWT_SECRET);

        const { initializeAsync } = require('../server/models/database');
        await initializeAsync();
        console.log('[VERCEL] Database initialized');

        const { initMailer } = require('../server/utils/email');
        initMailer();

        const { createApp } = require('../server/index');
        app = createApp();
        console.log('[VERCEL] App ready');
      } catch (err) {
        console.error('[VERCEL] Init failed:', err.message, err.stack);
        initError = err;
        throw err;
      }
    })();
  }

  return initPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureInit();
    return app(req, res);
  } catch (err) {
    console.error('[VERCEL] Request error:', err.message);
    res.status(500).json({
      error: 'Server initialization failed',
      detail: process.env.NODE_ENV === 'production' ? undefined : err.message,
      env: {
        turso_url_set: !!process.env.TURSO_DATABASE_URL,
        turso_token_set: !!process.env.TURSO_AUTH_TOKEN,
        jwt_set: !!process.env.JWT_SECRET,
      }
    });
  }
};
