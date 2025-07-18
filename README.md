# Historical Token Price Oracle with Interpolation Engine

A full-stack system to fetch, interpolate, and schedule historical ERC20 token prices on Ethereum (and easily extensible to other EVM chains). Built with Next.js, Node.js, MongoDB, Redis, BullMQ, Alchemy, Uniswap, and TheGraph.

---

## Features
- Fetch historical price for **any ERC20 token** at any timestamp
- Supports Ethereum mainnet (Polygon support is easy to add)
- Interpolates price if exact timestamp is missing
- Caches results in Redis for fast repeated queries
- Schedules full-history price fetching from token creation
- Robust error handling and user-friendly frontend
- Dynamic UniswapV2 pool lookup using TheGraph
- BullMQ for background job processing
- Unit-tested interpolation logic

---

## Tech Stack
- **Frontend:** Next.js, Zustand, Tailwind CSS
- **Backend:** Node.js, Express, Alchemy SDK, TheGraph, BullMQ
- **Database:** MongoDB
- **Cache:** Redis
- **Queue:** BullMQ
- **Web3:** Alchemy SDK, ethers.js

---

## Setup

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local or Atlas)
- Redis (local or cloud)
- Alchemy API key (Ethereum mainnet)

### 1. Clone and Install
```sh
git clone <your-repo-url>
cd prob3
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Variables
Create `backend/.env`:
```
ALCHEMY_API_KEY=your_alchemy_key
MONGODB_URI=mongodb://localhost:27017/token-prices
REDIS_URL=redis://localhost:6379
```
Create `frontend/.env.local` (optional):
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### 3. Run the App
- Start MongoDB and Redis (or use Docker Compose)
- In `backend/`: `npm run dev`
- In `frontend/`: `npm run dev`
- Visit [http://localhost:3000](http://localhost:3000)

---

## Usage

### Fetch a Price
- Enter any ERC20 token address (e.g., USDC, DAI, UNI, LINK, WBTC)
- Select Ethereum
- Pick a date/time (after the token/pool existed)
- Click **Get Price**
- See the price, source, and error handling in the UI

### Schedule Full History
- Enter a token address and click **Schedule Full History**
- The backend will fetch and store all daily prices from token creation to today

### Error Handling
- Try a date before the token/pool existed: see a user-friendly error
- Try a future date: see a user-friendly error
- Try an unsupported token: see a user-friendly error

---

## Extending
- Add support for Polygon or other EVM chains
- Add more DEXs (Sushiswap, UniswapV3)
- Add price charts or analytics
- Add more unit/integration tests


