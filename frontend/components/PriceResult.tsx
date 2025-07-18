"use client";
import { usePriceStore } from "../store/usePriceStore";

export default function PriceResult() {
  const { price, source, loading, error } = usePriceStore();

  if (loading) return <div className="mt-6 text-blue-600 font-semibold">Loading...</div>;
  if (error) {
    if (error.includes('No Uniswap pool data')) {
      return <div className="mt-6 text-orange-600 font-semibold">No price data available for this date (pool may not exist yet).</div>;
    }
    return <div className="mt-6 text-red-600 font-semibold">{error}</div>;
  }
  if (price == null) return null;

  return (
    <div className="mt-6 p-4 rounded-xl bg-green-50 dark:bg-green-900 text-green-900 dark:text-green-100 shadow">
      <div className="text-lg font-bold">Price: {price}</div>
      <div className="text-sm mt-1">Source: <span className="font-mono">{source}</span></div>
    </div>
  );
} 