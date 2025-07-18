function interpolate(ts, ts_before, price_before, ts_after, price_after) {
  if (ts_after === ts_before) return price_before;
  const ratio = (ts - ts_before) / (ts_after - ts_before);
  return price_before + (price_after - price_before) * ratio;
}

module.exports = { interpolate }; 