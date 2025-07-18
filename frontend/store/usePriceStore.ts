import { create } from 'zustand';

interface PriceState {
  price: number | null;
  source: string | null;
  loading: boolean;
  error: string | null;
  scheduleStatus: string | null;
  setPrice: (price: number, source: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setScheduleStatus: (status: string | null) => void;
}

export const usePriceStore = create<PriceState>((set) => ({
  price: null,
  source: null,
  loading: false,
  error: null,
  scheduleStatus: null,
  setPrice: (price, source) => set({ price, source, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  setScheduleStatus: (status) => set({ scheduleStatus: status }),
})); 