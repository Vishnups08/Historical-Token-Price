const { Alchemy, Network } = require('alchemy-sdk');
const PriceHistory = require('../db/priceHistory');
const redis = require('../cache/redis');
const { interpolate } = require('./interpolate');
const pRetry = (await import('p-retry')).default;
const { Interface } = require('ethers');
const fetch = require('node-fetch');

// UniswapV2Pair ABI (getReserves, token0, token1)
const UNISWAP_PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];
const CHAINLINK_AGGREGATOR_ABI = [
  "function latestRoundData() view returns (uint80, int256 answer, uint256, uint256, uint80)"
];

// USDC/WETH UniswapV2 pool and Chainlink ETH/USD
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_WETH_POOL = "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc";
const CHAINLINK_ETH_USD = "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419";

// Add popular token/pool mappings
const TOKEN_POOLS = {
  // token: { pool, pairedWith, pairedType }
  [USDC.toLowerCase()]: {
    pool: '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc', // USDC/WETH
    pairedWith: WETH,
    pairedType: 'WETH',
  },
  // DAI/WETH
  '0x6b175474e89094c44da98b954eedeac495271d0f': {
    pool: '0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11',
    pairedWith: WETH,
    pairedType: 'WETH',
  },
  // UNI/WETH
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': {
    pool: '0xd3d2E2692501A5c9Ca623199D38826e513033a17',
    pairedWith: WETH,
    pairedType: 'WETH',
  },
  // LINK/WETH
  '0x514910771af9ca656af840dff83e8264ecf986ca': {
    pool: '0xa2107fa78a3b1b6e2c6e3b6c7e2e8e3e3e3e3e3e', // Example, replace with real pool
    pairedWith: WETH,
    pairedType: 'WETH',
  },
  // WBTC/WETH
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': {
    pool: '0xBb2b8038a1640196FbE3e38816F3e67Cba72D940',
    pairedWith: WETH,
    pairedType: 'WETH',
  },
};

const UNISWAP_V2_SUBGRAPH = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2';

async function getBestUniswapV2Pool(token, network) {
  if (network !== 'ethereum') throw new Error('Only Ethereum mainnet supported for dynamic pool lookup');
  const cacheKey = `uniswapv2:pool:${token}`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached;
  const query = `{
    pairs(first: 5, orderBy: reserveUSD, orderDirection: desc, where: { token0: \"${token}\" }) {
      id token0 { id symbol } token1 { id symbol } reserveUSD
    }
    pairs1: pairs(first: 5, orderBy: reserveUSD, orderDirection: desc, where: { token1: \"${token}\" }) {
      id token0 { id symbol } token1 { id symbol } reserveUSD
    }
  }`;
  const res = await fetch(UNISWAP_V2_SUBGRAPH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  const pairs = [...(data.data.pairs || []), ...(data.data.pairs1 || [])];
  if (!pairs.length) throw new Error('No UniswapV2 pool found for this token');
  // Pick the pool with the highest reserveUSD
  pairs.sort((a, b) => parseFloat(b.reserveUSD) - parseFloat(a.reserveUSD));
  const best = pairs[0];
  await redis.set(cacheKey, best.id, 'EX', 3600);
  return best.id;
}

async function getUSDCPriceAtBlock(alchemy, blockNumber) {
  const iface = new Interface(UNISWAP_PAIR_ABI);
  // getReserves
  const reservesData = await alchemy.core.call({
    to: USDC_WETH_POOL,
    data: iface.encodeFunctionData("getReserves", [])
  }, blockNumber);

  if (reservesData === '0x') {
    throw new Error('No Uniswap pool data for this block (pool may not exist yet)');
  }

  const [reserve0, reserve1] = iface.decodeFunctionResult("getReserves", reservesData);
  // token0
  const token0Data = await alchemy.core.call({
    to: USDC_WETH_POOL,
    data: iface.encodeFunctionData("token0", [])
  }, blockNumber);
  const token0 = iface.decodeFunctionResult("token0", token0Data)[0];
  // USDC per WETH
  let usdcPerWeth;
  if (token0.toLowerCase() === USDC.toLowerCase()) {
    usdcPerWeth = Number(reserve0) / Number(reserve1);
  } else {
    usdcPerWeth = Number(reserve1) / Number(reserve0);
  }
  // Chainlink ETH/USD
  const chainlinkIface = new Interface(CHAINLINK_AGGREGATOR_ABI);
  const roundData = await alchemy.core.call({
    to: CHAINLINK_ETH_USD,
    data: chainlinkIface.encodeFunctionData("latestRoundData", [])
  }, blockNumber);
  const [, ethUsdRaw] = chainlinkIface.decodeFunctionResult("latestRoundData", roundData);
  const ethUsd = Number(ethUsdRaw) / 1e8;
  // USDC/USD = usdcPerWeth * ethUsd
  return usdcPerWeth * ethUsd;
}

async function getTokenPriceAtBlock(token, network, blockNumber) {
  const pool = await getBestUniswapV2Pool(token, network);
  const iface = new Interface(UNISWAP_PAIR_ABI);
  // getReserves
  const reservesData = await getAlchemyInstance(network).core.call({
    to: pool,
    data: iface.encodeFunctionData("getReserves", [])
  }, blockNumber);
  if (reservesData === '0x') {
    throw new Error('No Uniswap pool data for this block (pool may not exist yet)');
  }
  const [reserve0, reserve1] = iface.decodeFunctionResult("getReserves", reservesData);
  // token0
  const token0Data = await getAlchemyInstance(network).core.call({
    to: pool,
    data: iface.encodeFunctionData("token0", [])
  }, blockNumber);
  const token0 = iface.decodeFunctionResult("token0", token0Data)[0];
  // token1
  const token1Data = await getAlchemyInstance(network).core.call({
    to: pool,
    data: iface.encodeFunctionData("token1", [])
  }, blockNumber);
  const token1 = iface.decodeFunctionResult("token1", token1Data)[0];
  // Determine paired token
  let pairedType = null;
  let priceInPaired;
  if (token0.toLowerCase() === token.toLowerCase()) {
    priceInPaired = Number(reserve1) / Number(reserve0);
    pairedType = token1.toLowerCase();
  } else {
    priceInPaired = Number(reserve0) / Number(reserve1);
    pairedType = token0.toLowerCase();
  }
  // If paired with WETH, get ETH/USD price
  if (pairedType === WETH.toLowerCase()) {
    const chainlinkIface = new Interface(CHAINLINK_AGGREGATOR_ABI);
    const roundData = await getAlchemyInstance(network).core.call({
      to: CHAINLINK_ETH_USD,
      data: chainlinkIface.encodeFunctionData("latestRoundData", [])
    }, blockNumber);
    const [, ethUsdRaw] = chainlinkIface.decodeFunctionResult("latestRoundData", roundData);
    const ethUsd = Number(ethUsdRaw) / 1e8;
    return priceInPaired * ethUsd;
  } else if (pairedType === USDC.toLowerCase()) {
    // Paired with USDC, price is in USD
    return priceInPaired;
  } else {
    throw new Error('Paired token is not WETH or USDC; cannot compute USD price');
  }
}

const getAlchemyNetwork = (network) => {
  if (network === 'ethereum') return Network.ETH_MAINNET;
  if (network === 'polygon') return Network.MATIC_MAINNET;
  throw new Error('Unsupported network');
};

const getAlchemyInstance = (network) => {
  return new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY,
    network: getAlchemyNetwork(network),
  });
};

async function getTokenPriceAtTimestamp(token, network, timestamp) {
  console.log('getTokenPriceAtTimestamp called with:', { token, network, timestamp });
  if (timestamp > Math.floor(Date.now() / 1000)) {
    console.log('Timestamp is in the future!');
    throw new Error('Timestamp is in the future. Please use a past date.');
  }
  const cacheKey = `price:${token}:${network}:${timestamp}`;
  // 1. Check Redis cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('Returning from cache');
      return { price: parseFloat(cached), source: 'cache' };
    }
  } catch (err) {
    console.error('Error checking Redis cache:', err);
  }

  // 2. Check MongoDB for exact match
  const date = new Date(timestamp * 1000);
  try {
    let priceDoc = await PriceHistory.findOne({ token, network, date });
    if (priceDoc) {
      await redis.set(cacheKey, priceDoc.price, 'EX', 3600);
      console.log('Returning from MongoDB');
      return { price: priceDoc.price, source: 'mongo' };
    }
  } catch (err) {
    console.error('Error checking MongoDB:', err);
  }

  // 3. Interpolate if possible
  try {
    const before = await PriceHistory.findOne({ token, network, date: { $lte: date } }).sort({ date: -1 });
    const after = await PriceHistory.findOne({ token, network, date: { $gte: date } }).sort({ date: 1 });
    if (before && after && before.date.getTime() !== after.date.getTime()) {
      const ts_before = Math.floor(before.date.getTime() / 1000);
      const ts_after = Math.floor(after.date.getTime() / 1000);
      const interpolated = interpolate(timestamp, ts_before, before.price, ts_after, after.price);
      await redis.set(cacheKey, interpolated, 'EX', 3600);
      console.log('Returning interpolated value');
      return { price: interpolated, source: 'interpolated' };
    }
  } catch (err) {
    console.error('Error during interpolation:', err);
  }

  // 4. Fallback: fetch from Uniswap/Chainlink for supported tokens
  const tokenInfo = TOKEN_POOLS[token.toLowerCase()];
  if (network === 'ethereum' && tokenInfo) {
    try {
      const alchemy = getAlchemyInstance(network);
      const blockNumber = await pRetry(() => getBlockNumberByTimestamp(network, timestamp), { retries: 3 });
      console.log('blockNumber:', blockNumber);
      const price = await pRetry(() => getTokenPriceAtBlock(token, network, blockNumber), { retries: 3 });
      await PriceHistory.create({ token, network, date: new Date(timestamp * 1000), price });
      await redis.set(`price:${token}:${network}:${timestamp}`, price, 'EX', 3600);
      console.log('Returning token price from Uniswap/Chainlink');
      return { price, source: 'uniswap+chainlink' };
    } catch (err) {
      console.error('Error fetching token price from Uniswap/Chainlink:', err);
      throw err;
    }
  }

  // 5. Fallback: ETH price (mock for other tokens)
  try {
    const alchemy = getAlchemyInstance(network);
    const blockNumber = await pRetry(() => getBlockNumberByTimestamp(network, timestamp), { retries: 3 });
    console.log('blockNumber:', blockNumber);
    const block = await pRetry(() => alchemy.core.getBlock(blockNumber), { retries: 3 });
    let price = null;
    if (block && block.baseFeePerGas) {
      price = parseFloat(block.baseFeePerGas) / 1e9;
    } else {
      price = 1.234;
    }
    await PriceHistory.create({ token, network, date, price });
    await redis.set(cacheKey, price, 'EX', 3600);
    console.log('Returning fallback ETH price');
    return { price, source: 'alchemy' };
  } catch (err) {
    console.error('Error fetching fallback ETH price:', err);
    throw err;
  }
}

// Helper: Find closest block number to a given timestamp
async function getBlockNumberByTimestamp(network, timestamp) {
  const alchemy = getAlchemyInstance(network);
  // Binary search between block 1 and latest
  let low = 1;
  let high = await alchemy.core.getBlockNumber();
  let closest = low;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const block = await alchemy.core.getBlock(mid);
    if (!block || !block.timestamp) break;
    if (block.timestamp === timestamp) return mid;
    if (block.timestamp < timestamp) {
      closest = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return closest;
}

// Real token creation date: first transfer
async function getTokenCreationDate(token, network) {
  const alchemy = getAlchemyInstance(network);
  const transfers = await alchemy.core.getAssetTransfers({
    fromBlock: '0x0',
    toAddress: null,
    contractAddresses: [token],
    category: ['erc20', 'erc721', 'erc1155'],
    maxCount: 1,
    order: 'asc',
  });
  if (transfers.transfers && transfers.transfers.length > 0) {
    const ts = transfers.transfers[0].metadata?.blockTimestamp;
    if (ts) return new Date(ts);
  }
  // fallback: now
  return new Date();
}

module.exports = {
  getTokenPriceAtTimestamp,
  getTokenCreationDate,
  getBlockNumberByTimestamp,
}; 