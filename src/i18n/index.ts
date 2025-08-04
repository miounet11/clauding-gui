import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import language resources
import zhCommon from './locales/zh/common.json';
import zhSettings from './locales/zh/settings.json';
import zhSessions from './locales/zh/sessions.json';
import zhAgents from './locales/zh/agents.json';
import zhErrors from './locales/zh/errors.json';
import zhProjects from './locales/zh/projects.json';
import zhUsage from './locales/zh/usage.json';
import zhCheckpoint from './locales/zh/checkpoint.json';
import zhMCP from './locales/zh/mcp.json';
import zhWidgets from './locales/zh/widgets.json';
import zhStorage from './locales/zh/storage.json';

import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enSessions from './locales/en/sessions.json';
import enAgents from './locales/en/agents.json';
import enErrors from './locales/en/errors.json';
import enProjects from './locales/en/projects.json';
import enUsage from './locales/en/usage.json';
import enCheckpoint from './locales/en/checkpoint.json';
import enMCP from './locales/en/mcp.json';
import enWidgets from './locales/en/widgets.json';
import enStorage from './locales/en/storage.json';

const resources = {
  zh: {
    common: zhCommon,
    settings: zhSettings,
    sessions: zhSessions,
    agents: zhAgents,
    errors: zhErrors,
    projects: zhProjects,
    usage: zhUsage,
    checkpoint: zhCheckpoint,
    mcp: zhMCP,
    widgets: zhWidgets,
    storage: zhStorage,
  },
  en: {
    common: enCommon,
    settings: enSettings,
    sessions: enSessions,
    agents: enAgents,
    errors: enErrors,
    projects: enProjects,
    usage: enUsage,
    checkpoint: enCheckpoint,
    mcp: enMCP,
    widgets: enWidgets,
    storage: enStorage,
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh', // Default to Chinese
    defaultNS: 'common',
    ns: ['common', 'settings', 'sessions', 'agents', 'errors', 'projects', 'usage', 'checkpoint', 'mcp', 'widgets', 'storage'],
    
    interpolation: {
      escapeValue: false // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'claudia-language'
    },
    
    react: {
      useSuspense: false // Disable suspense to avoid issues with Tauri
    }
  });

// Listen for language changes and sync with backend
i18n.on('languageChanged', async (lng) => {
  // Store language preference
  localStorage.setItem('claudia-language', lng);
  
  // Update document language attribute
  document.documentElement.lang = lng;
});

export default i18n;