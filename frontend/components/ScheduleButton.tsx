"use client";
import { useState } from "react";
import { usePriceStore } from "../store/usePriceStore";

export default function ScheduleButton() {
  const [token, setToken] = useState("");
  const [network, setNetwork] = useState("ethereum");
  const { scheduleStatus, setScheduleStatus } = usePriceStore();

  const handleSchedule = async () => {
    setScheduleStatus("Scheduling...");
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, network }),
      });
      const data = await res.json();
      if (res.ok) {
        setScheduleStatus("Scheduled successfully!");
      } else {
        setScheduleStatus(data.error || "Failed to schedule");
      }
    } catch (err: any) {
      setScheduleStatus(err.message || "Request failed");
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-8 w-full max-w-md">
      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Token address for full history"
        />
        <select
          className="border rounded px-3 py-2"
          value={network}
          onChange={e => setNetwork(e.target.value)}
        >
          <option value="ethereum">Ethereum</option>
          <option value="polygon">Polygon</option>
        </select>
        <button
          className="bg-purple-600 text-white rounded px-4 py-2 font-semibold hover:bg-purple-700"
          onClick={handleSchedule}
          type="button"
        >
          Schedule Full History
        </button>
      </div>
      {scheduleStatus && <div className="text-sm mt-1 text-purple-700 dark:text-purple-300">{scheduleStatus}</div>}
    </div>
  );
} 