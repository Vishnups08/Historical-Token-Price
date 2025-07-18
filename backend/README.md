# Backend – Historical Token Price Oracle with Interpolation Engine

## Overview
This backend powers a historical ERC20 token price oracle. It provides endpoints to fetch, interpolate, and schedule historical token prices using MongoDB, Redis, BullMQ, Alchemy, Uniswap, and TheGraph.

---

## Features
- `/price` endpoint: fetches historical price for any ERC20 token
- `/schedule` endpoint: schedules full-history price fetching
- Interpolates price if exact timestamp is missing
- Caches results in Redis
- Stores prices in MongoDB
- Dynamic UniswapV2 pool lookup using TheGraph
- Handles Alchemy rate limits and errors
- BullMQ worker for background jobs

---

## Setup

### 1. Install dependencies
```sh
npm install
```

### 2. Environment Variables
Create a `.env` file in `backend/`:
```
ALCHEMY_API_KEY=your_alchemy_key
MONGODB_URI=mongodb://localhost:27017/token-prices
REDIS_URL=redis://localhost:6379
```

### 3. Run the backend
```sh
npm run dev
```

---

## Scripts
- `npm run dev` – Start in development mode (nodemon)
- `npm start` – Start in production

---

## Endpoints

### `POST /price`
- **Body:** `{ token, network, timestamp }`
- **Returns:** `{ price, source }` or error
- **Logic:**
  1. Check Redis cache
  2. Check MongoDB
  3. Interpolate if needed
  4. Fetch from Uniswap/Chainlink via Alchemy if not found
  5. Store in MongoDB and Redis

### `POST /schedule`
- **Body:** `{ token, network }`
- **Schedules** a BullMQ job to fetch all daily prices from token creation to today

### `GET /health`
- Health check endpoint

---

## Architecture
- **Express** for API
- **MongoDB** for persistent price storage
- **Redis** for caching and BullMQ
- **BullMQ** for background jobs
- **Alchemy SDK** for on-chain data
- **TheGraph** for dynamic Uniswap pool lookup
- **ethers.js** for ABI encoding/decoding
