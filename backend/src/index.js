require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const connectMongo = require('./db/mongo');
const redis = require('./cache/redis');
const priceRouter = require('./api/price');
app.use('/price', priceRouter);
const scheduleRouter = require('./api/schedule');
app.use('/schedule', scheduleRouter);
require('./jobs/fetchPrices');

// Global error handler (must be after all routes)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

(async () => {
  await connectMongo();
  // Redis connection is initialized on import

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
}); 