import { useTranslation } from 'react-i18next';
import { useI18nStore } from '@/stores/i18nStore';
import { supportedLanguages } from '@/i18n/languages';

export const useI18n = (namespace?: string | string[]) => {
  const { t, i18n } = useTranslation(namespace);
  const { currentLanguage, changeLanguage, isLoading } = useI18nStore();
  
  return {
    t,
    i18n,
    currentLanguage,
    changeLanguage,
    isLoading,
    availableLanguages: supportedLanguages,
    isRTL: false, // Can be extended for RTL languages in the future
  };
};