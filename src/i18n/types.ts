import 'react-i18next';

export type Language = 'zh' | 'en';

export interface LanguageOption {
  code: Language;
  name: string;
  flag?: string;
}

// Extend the react-i18next types
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof import('./locales/zh/common.json');
      settings: typeof import('./locales/zh/settings.json');
      sessions: typeof import('./locales/zh/sessions.json');
      agents: typeof import('./locales/zh/agents.json');
      errors: typeof import('./locales/zh/errors.json');
    };
  }
}