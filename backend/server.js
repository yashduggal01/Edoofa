require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { initializePool, initializeDatabase } = require('./db');

const rfqRoutes = require('./routes/rfq');
const bidRoutes = require('./routes/bids');
const eventRoutes = require('./routes/events');
const insightRoutes = require('./routes/insights');

const app = express();

const PORT = process.env.PORT || 5000;

/*
========================================
MIDDLEWARE,,
========================================
*/

// Better deployment-safe CORS setup
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );
  next();
});

/*
========================================
ROUTES
========================================
*/

app.use('/api/rfq', rfqRoutes);
app.use('/api/rfq', bidRoutes);
app.use('/api/rfq', eventRoutes);

app.use('/api/insights', insightRoutes);

/*
========================================
HEALTH CHECK
========================================
*/

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    database: 'sqlite',
    timestamp: new Date().toISOString()
  });
});

/*
========================================
404 HANDLER
========================================
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

/*
========================================
GLOBAL ERROR HANDLER
========================================
*/

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

/*
========================================
START SERVER
========================================
*/

async function startServer() {
  try {
    // Initialize SQLite
    await initializePool();
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log('====================================');
      console.log('British Auction RFQ System');
      console.log(`Server running on PORT ${PORT}`);
      console.log(`Health URL: /api/health`);
      console.log('====================================');
    });

  } catch (error) {
    console.error('[STARTUP ERROR]', error);

    process.exit(1);
  }
}

startServer();