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

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/rfq', rfqRoutes);
app.use('/api/rfq', bidRoutes);
app.use('/api/rfq', eventRoutes);
app.use('/api/insights', insightRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'sqlite', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    await initializePool();
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log('');
      console.log('British Auction RFQ System');
      console.log(`Backend running at http://localhost:${PORT}`);
      console.log(`API base: http://localhost:${PORT}/api`);
      console.log('');
    });
  } catch (error) {
    console.error('[ERROR] Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
