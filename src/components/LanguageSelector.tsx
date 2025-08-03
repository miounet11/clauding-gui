import React from 'react';
import { Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/hooks/useI18n';
import { supportedLanguages } from '@/i18n/languages';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  className?: string;
  showIcon?: boolean;
  showFlag?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  className,
  showIcon = true,
  showFlag = false 
}) => {
  const { currentLanguage, changeLanguage, isLoading } = useI18n();
  
  const currentLang = supportedLanguages.find(lang => lang.code === currentLanguage);
  
  return (
    <Select 
      value={currentLanguage} 
      onValueChange={changeLanguage}
      disabled={isLoading}
    >
      <SelectTrigger className={cn("w-[140px]", className)}>
        {showIcon && <Globe className="w-4 h-4 mr-2" />}
        <SelectValue>
          {currentLang && (
            <span className="flex items-center gap-1">
              {showFlag && currentLang.flag && (
                <span className="text-base">{currentLang.flag}</span>
              )}
              {currentLang.name}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {supportedLanguages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-2">
              {lang.flag && <span className="text-base">{lang.flag}</span>}
              {lang.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};