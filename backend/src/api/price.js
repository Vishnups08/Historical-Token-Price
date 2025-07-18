const express = require('express');
const router = express.Router();
const { getTokenPriceAtTimestamp } = require('../services/alchemy');

router.post('/', async (req, res) => {
  console.log('--- /price endpoint hit ---');
  const { token, network, timestamp } = req.body;
  console.log('Received /price request:', req.body);
  if (!token || !network || !timestamp) {
    console.log('Missing params');
    return res.status(400).json({ error: 'token, network, and timestamp are required' });
  }
  try {
    const result = await getTokenPriceAtTimestamp(token, network, timestamp);
    console.log('Result:', result);
    res.json(result);
  } catch (err) {
    console.error('Error in /price:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 