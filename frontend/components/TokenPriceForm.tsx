"use client";
import { useState } from "react";
import { usePriceStore } from "../store/usePriceStore";

const networks = [
  { label: "Ethereum", value: "ethereum" },
  { label: "Polygon", value: "polygon" },
];

export default function TokenPriceForm() {
  const [token, setToken] = useState("");
  const [network, setNetwork] = useState(networks[0].value);
  const [timestamp, setTimestamp] = useState("");
  const { setPrice, setLoading, setError } = usePriceStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrice(null as any, null as any);
    try {
      const unixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000);
      const res = await fetch("/api/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, network, timestamp: unixTimestamp }),
      });
      const data = await res.json();
      if (res.ok) {
        setPrice(data.price, data.source);
      } else {
        setError(data.error || "Unknown error");
      }
    } catch (err: any) {
      setError(err.message || "Request failed");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md bg-white dark:bg-zinc-900 p-6 rounded-xl shadow">
      <label className="font-semibold">Token Address</label>
      <input
        className="border rounded px-3 py-2"
        value={token}
        onChange={e => setToken(e.target.value)}
        placeholder="0x..."
        required
      />
      <label className="font-semibold">Network</label>
      <select
        className="border rounded px-3 py-2"
        value={network}
        onChange={e => setNetwork(e.target.value)}
      >
        {networks.map(n => (
          <option key={n.value} value={n.value}>{n.label}</option>
        ))}
      </select>
      <label className="font-semibold">Timestamp</label>
      <input
        className="border rounded px-3 py-2"
        type="datetime-local"
        value={timestamp}
        onChange={e => setTimestamp(e.target.value)}
        required
      />
      <button
        type="submit"
        className="bg-blue-600 text-white rounded px-4 py-2 mt-2 hover:bg-blue-700 font-semibold"
      >
        Get Price
      </button>
    </form>
  );
} 