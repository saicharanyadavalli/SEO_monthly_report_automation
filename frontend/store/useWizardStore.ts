import { create } from 'zustand';
import { SLIDE_CATALOG } from '@/lib/catalog/slides';

interface WizardConfig {
  clientKey: string;
  month: string;
  useRealData: boolean;
  useAiInsights: boolean;
  llmModel: string;
}

interface WizardState {
  currentStep: number;
  
  // Step 1: Config
  config: WizardConfig;
  updateConfig: (updates: Partial<WizardConfig>) => void;
  
  // Step 2: Slides
  selectedSlideIds: string[];
  toggleSlide: (id: string) => void;
  selectAllSlides: () => void;
  deselectAllSlides: () => void;
  resetSlides: () => void;
  
  // Step 3: Reorder
  orderedSlideIds: string[];
  reorderSlides: (newOrder: string[]) => void;
  resetOrder: () => void;
  
  // Step 5: Complete
  reportMetadata: any | null;
  setReportMetadata: (metadata: any) => void;
  
  // Navigation
  nextStep: () => void;
  prevStep: () => void;
  resetWizard: () => void;
}

const DEFAULT_SLIDES = SLIDE_CATALOG.map(s => s.id);

export const useWizardStore = create<WizardState>((set, get) => ({
  currentStep: 1,
  
  config: {
    clientKey: '',
    month: '',
    useRealData: true,
    useAiInsights: true,
    llmModel: 'glm-5', // Default
  },
  
  updateConfig: (updates) => set((state) => ({
    config: { ...state.config, ...updates }
  })),
  
  selectedSlideIds: DEFAULT_SLIDES,
  
  toggleSlide: (id) => set((state) => {
    const isSelected = state.selectedSlideIds.includes(id);
    let newSelected;
    if (isSelected) {
      newSelected = state.selectedSlideIds.filter(s => s !== id);
    } else {
      newSelected = [...state.selectedSlideIds, id];
    }
    
    // Also sync the ordered array: if removing, filter it out. If adding, append it.
    let newOrdered = state.orderedSlideIds;
    if (isSelected) {
      newOrdered = newOrdered.filter(s => s !== id);
    } else {
      newOrdered = [...newOrdered, id];
    }
    
    return { selectedSlideIds: newSelected, orderedSlideIds: newOrdered };
  }),
  
  selectAllSlides: () => set({ 
    selectedSlideIds: DEFAULT_SLIDES,
    orderedSlideIds: DEFAULT_SLIDES
  }),
  
  deselectAllSlides: () => set({ 
    selectedSlideIds: [],
    orderedSlideIds: []
  }),
  
  resetSlides: () => set({ 
    selectedSlideIds: DEFAULT_SLIDES,
    orderedSlideIds: DEFAULT_SLIDES
  }),
  
  orderedSlideIds: DEFAULT_SLIDES,
  
  reorderSlides: (newOrder) => set({ orderedSlideIds: newOrder }),
  
  resetOrder: () => set((state) => {
    // Reset order back to catalog default, but only for currently selected slides
    const defaultOrder = SLIDE_CATALOG
      .filter(s => state.selectedSlideIds.includes(s.id))
      .map(s => s.id);
    return { orderedSlideIds: defaultOrder };
  }),
  
  reportMetadata: null,
  setReportMetadata: (metadata) => set({ reportMetadata: metadata }),
  
  nextStep: () => set((state) => ({ 
    currentStep: Math.min(state.currentStep + 1, 5) 
  })),
  
  prevStep: () => set((state) => ({ 
    currentStep: Math.max(state.currentStep - 1, 1) 
  })),
  
  resetWizard: () => set({
    currentStep: 1,
    config: {
      clientKey: '',
      month: '',
      useRealData: true,
      useAiInsights: true,
      llmModel: 'glm-5',
    },
    selectedSlideIds: DEFAULT_SLIDES,
    orderedSlideIds: DEFAULT_SLIDES
  })
}));
