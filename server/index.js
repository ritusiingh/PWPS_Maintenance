require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initializeAsync } = require('./models/database');
const { initMailer } = require('./utils/email');

function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, message: { error: 'Too many requests' } });
  app.use('/api', limiter);

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/flats', require('./routes/flats'));
  app.use('/api/charges', require('./routes/charges'));
  app.use('/api', require('./routes/billing'));
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api', require('./routes/dashboard'));

  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html')));
  }

  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

// Direct run (local development / OCI)
if (require.main === module || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  initializeAsync().then(() => {
    initMailer();
    const app = createApp();
    app.listen(PORT, () => {
      console.log(`\ud83d\ude80 Server running on port ${PORT}`);
      console.log(`\ud83d\udcca PWPS Maintenance Calculator API ready`);
    });
  }).catch(err => { console.error('Startup failed:', err); process.exit(1); });
}

module.exports = { createApp, initializeAsync };
