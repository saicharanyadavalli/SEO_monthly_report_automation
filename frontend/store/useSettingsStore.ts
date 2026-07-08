import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LLMModel } from '@/lib/pipeline/models';

interface SettingsState {
  customModels: LLMModel[];
  defaultModel: string;
  addCustomModel: (model: LLMModel) => void;
  removeCustomModel: (id: string) => void;
  setDefaultModel: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      customModels: [],
      defaultModel: 'glm-5',
      addCustomModel: (model) => set((state) => ({ 
        customModels: [...state.customModels.filter(m => m.id !== model.id), model] 
      })),
      removeCustomModel: (id) => set((state) => ({
        customModels: state.customModels.filter(m => m.id !== id)
      })),
      setDefaultModel: (id) => set({ defaultModel: id }),
    }),
    {
      name: 'seo-report-settings',
    }
  )
);
