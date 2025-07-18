import TokenPriceForm from "../components/TokenPriceForm";
import PriceResult from "../components/PriceResult";
import ScheduleButton from "../components/ScheduleButton";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Historical Token Price Oracle</h1>
      <TokenPriceForm />
      <PriceResult />
      <ScheduleButton />
    </div>
  );
}
