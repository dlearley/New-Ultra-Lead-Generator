import { create } from 'zustand';
import { api } from '@/lib/api';

interface Territory {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  polygonCoordinates?: any[];
  radiusGeometry?: any;
  stateCode?: string;
  countyCode?: string;
  ownerId?: string;
  ownerIds?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TerritoryStore {
  territories: Territory[];
  isLoading: boolean;
  error: string | null;
  fetchTerritories: () => Promise<void>;
  createTerritory: (data: any) => Promise<Territory>;
  updateTerritory: (id: string, data: any) => Promise<Territory>;
  deleteTerritory: (id: string) => Promise<void>;
  assignOwner: (id: string, ownerId: string) => Promise<Territory>;
}

export const territoryStore = create<TerritoryStore>((set) => ({
  territories: [],
  isLoading: false,
  error: null,

  fetchTerritories: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/territories');
      set({ territories: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  createTerritory: async (data: any) => {
    try {
      const response = await api.post('/territories', data);
      set((state) => ({
        territories: [...state.territories, response.data],
      }));
      return response.data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateTerritory: async (id: string, data: any) => {
    try {
      const response = await api.put(`/territories/${id}`, data);
      set((state) => ({
        territories: state.territories.map((t) =>
          t.id === id ? response.data : t,
        ),
      }));
      return response.data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteTerritory: async (id: string) => {
    try {
      await api.delete(`/territories/${id}`);
      set((state) => ({
        territories: state.territories.filter((t) => t.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  assignOwner: async (id: string, ownerId: string) => {
    try {
      const response = await api.put(`/territories/${id}/assign-owner`, { ownerId });
      set((state) => ({
        territories: state.territories.map((t) =>
          t.id === id ? response.data : t,
        ),
      }));
      return response.data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));
