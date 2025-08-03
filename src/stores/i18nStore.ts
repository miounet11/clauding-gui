import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';
import type { Language } from '@/i18n/types';
import { supportedLanguages } from '@/i18n/languages';

interface I18nState {
  currentLanguage: Language;
  isLoading: boolean;
  
  // Actions
  changeLanguage: (language: Language) => Promise<void>;
  initializeLanguage: () => Promise<void>;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      currentLanguage: 'zh',
      isLoading: false,
      
      changeLanguage: async (language) => {
        if (get().currentLanguage === language) return;
        
        set({ isLoading: true });
        try {
          await i18n.changeLanguage(language);
          set({ currentLanguage: language });
        } catch (error) {
          console.error('Failed to change language:', error);
          // Revert to previous language on error
          await i18n.changeLanguage(get().currentLanguage);
        } finally {
          set({ isLoading: false });
        }
      },
      
      initializeLanguage: async () => {
        const storedLanguage = localStorage.getItem('claudia-language') as Language | null;
        const browserLanguage = navigator.language.startsWith('zh') ? 'zh' : 'en';
        const language = storedLanguage || browserLanguage;
        
        if (supportedLanguages.some(lang => lang.code === language)) {
          await get().changeLanguage(language);
        }
      }
    }),
    {
      name: 'claudia-i18n',
      partialize: (state) => ({ currentLanguage: state.currentLanguage })
    }
  )
);