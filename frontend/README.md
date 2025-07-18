# Frontend – Historical Token Price Oracle with Interpolation Engine

## Overview
This is the Next.js frontend for the historical ERC20 token price oracle. It provides a modern, responsive UI to fetch, interpolate, and schedule historical token prices for any ERC20 token on Ethereum.

---

## Features
- Form to input token address, network, and timestamp
- Network selector (Ethereum)
- Date/time picker for timestamp
- Displays price, source, loading, and error states
- User-friendly error messages for missing data, unsupported tokens, or future dates
- "Schedule Full History" button to trigger backend jobs
- Zustand for state management
- Responsive, modern dashboard (Tailwind CSS)

---

## Setup

### 1. Install dependencies
```sh
npm install
```

### 2. Environment Variables
Create a `.env.local` file in `frontend/` (optional):
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### 3. Run the frontend
```sh
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000)

---

## Usage
- Enter any ERC20 token address (e.g., USDC, DAI, UNI, LINK, WBTC)
- Select Ethereum
- Pick a date/time (after the token/pool existed)
- Click **Get Price** to fetch and display the price
- Click **Schedule Full History** to trigger backend job
- See user-friendly errors for unsupported tokens, old/future dates, or network issues

---

## State Management
- Uses Zustand for price, loading, error, and schedule status


