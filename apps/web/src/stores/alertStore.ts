import { create } from 'zustand';
import { api } from '@/lib/api';

interface Alert {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  territoryId: string;
  savedSearch: any;
  cadence: string;
  deliveryChannels: string[];
  recipients?: string[];
  isActive: boolean;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface AlertRun {
  id: string;
  alertId: string;
  status: string;
  newLeadsCount: number;
  queueJobId?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface AlertStore {
  alerts: Alert[];
  runs: AlertRun[];
  isLoading: boolean;
  error: string | null;
  fetchAlerts: () => Promise<void>;
  fetchRuns: (alertId: string) => Promise<void>;
  createAlert: (data: any) => Promise<Alert>;
  updateAlert: (id: string, data: any) => Promise<Alert>;
  deleteAlert: (id: string) => Promise<void>;
  triggerAlert: (id: string) => Promise<AlertRun>;
}

export const alertStore = create<AlertStore>((set) => ({
  alerts: [],
  runs: [],
  isLoading: false,
  error: null,

  fetchAlerts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/alerts');
      set({ alerts: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRuns: async (alertId: string) => {
    try {
      const response = await api.get(`/alerts/${alertId}/runs`);
      set({ runs: response.data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  createAlert: async (data: any) => {
    try {
      const response = await api.post('/alerts', data);
      set((state) => ({
        alerts: [...state.alerts, response.data],
      }));
      return response.data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateAlert: async (id: string, data: any) => {
    try {
      const response = await api.put(`/alerts/${id}`, data);
      set((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === id ? response.data : a,
        ),
      }));
      return response.data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteAlert: async (id: string) => {
    try {
      await api.delete(`/alerts/${id}`);
      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  triggerAlert: async (id: string) => {
    try {
      const response = await api.post(`/alerts/${id}/trigger`);
      set((state) => ({
        runs: [response.data, ...state.runs],
      }));
      return response.data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));
