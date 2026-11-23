export const LANGUAGES=['zh-CN','zh-TW','en-US','ja','es','fr'] as const;
export type Language=typeof LANGUAGES[number];
export type LanguageSetting=Language|'system';
export const LANGUAGE_NAMES:Record<Language,string>={'zh-CN':'简体中文','zh-TW':'繁體中文','en-US':'English (US)',ja:'日本語',es:'Español',fr:'Français'};
export function resolveLanguage(setting:unknown,system='en-US'):Language{
 if(LANGUAGES.includes(setting as Language))return setting as Language;
 const tag=system.toLowerCase();
 if(tag.startsWith('zh'))return /tw|hk|mo|hant/.test(tag)?'zh-TW':'zh-CN';
 if(tag.startsWith('ja'))return 'ja';if(tag.startsWith('es'))return 'es';if(tag.startsWith('fr'))return 'fr';return 'en-US';
}
