import type { LanguageOption } from './types';

export const supportedLanguages: LanguageOption[] = [
  {
    code: 'zh',
    name: '中文',
    flag: '🇨🇳'
  },
  {
    code: 'en',
    name: 'English',
    flag: '🇺🇸'
  }
];

export const defaultLanguage: LanguageOption = supportedLanguages[0]; // Chinese as default