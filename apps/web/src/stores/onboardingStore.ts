import { create } from 'zustand';
import { api } from '@/lib/api';

interface OrgICP {
  industries: string[];
  geographies: string[];
  dealSizes: string[];
  personas: string[];
  aiScoring?: {
    score: number;
    updatedAt: Date;
    factors: Record<string, number>;
  };
}

interface OnboardingData {
  id: string;
  organizationId: string;
  orgICP: OrgICP;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface OnboardingStore {
  onboardingData: OnboardingData | null;
  isLoading: boolean;
  error: string | null;
  fetchOnboarding: () => Promise<void>;
  updateOrgICP: (data: Partial<OrgICP>) => Promise<OnboardingData>;
  completeOnboarding: (icp: OrgICP) => Promise<OnboardingData>;
}

export const onboardingStore = create<OnboardingStore>((set) => ({
  onboardingData: null,
  isLoading: false,
  error: null,

  fetchOnboarding: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/onboarding');
      set({ onboardingData: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  updateOrgICP: async (data: Partial<OrgICP>) => {
    try {
      const response = await api.put('/onboarding/icp', data);
      set({ onboardingData: response.data });
      return response.data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  completeOnboarding: async (icp: OrgICP) => {
    try {
      const response = await api.post('/onboarding/complete', { orgICP: icp });
      set({ onboardingData: response.data });
      return response.data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));
