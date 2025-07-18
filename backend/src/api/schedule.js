const express = require('express');
const router = express.Router();
const { Queue } = require('bullmq');
const redis = require('../cache/redis');

const QUEUE_NAME = 'fetch-prices';
const fetchPricesQueue = new Queue(QUEUE_NAME, { connection: redis });

router.post('/', async (req, res) => {
  const { token, network } = req.body;
  if (!token || !network) {
    return res.status(400).json({ error: 'token and network are required' });
  }
  await fetchPricesQueue.add('fetch', { token, network });
  res.json({ message: 'Schedule request received', token, network });
});

module.exports = router; 