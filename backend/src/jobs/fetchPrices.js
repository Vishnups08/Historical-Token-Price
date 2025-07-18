const { Worker, Queue } = require('bullmq');
const { getTokenCreationDate, getTokenPriceAtTimestamp } = require('../services/alchemy');
const PriceHistory = require('../db/priceHistory');
const redis = require('../cache/redis');

const QUEUE_NAME = 'fetch-prices';

const bullmqConnection = {
  ...redis.options,
  maxRetriesPerRequest: null,
};

const worker = new Worker(
  QUEUE_NAME,
  async job => {
    const { token, network } = job.data;
    // 1. Get token creation date
    const creationDate = await getTokenCreationDate(token, network);
    // 2. For each day from creationDate to today, fetch price and store in MongoDB
    const today = new Date();
    let current = new Date(creationDate);
    while (current <= today) {
      const timestamp = Math.floor(current.getTime() / 1000);
      await getTokenPriceAtTimestamp(token, network, timestamp);
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return { status: 'done' };
  },
  { connection: bullmqConnection }
);

worker.on('completed', job => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

module.exports = worker; 