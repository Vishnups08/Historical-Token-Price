const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
  token: { type: String, required: true },
  network: { type: String, required: true },
  date: { type: Date, required: true },
  price: { type: Number, required: true },
});

const PriceHistory = mongoose.model('PriceHistory', priceHistorySchema);

module.exports = PriceHistory; 