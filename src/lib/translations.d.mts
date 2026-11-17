export type Locale = 'fr' | 'en' | 'ar';
export function translate(locale: Locale, text: string): string;
export const supportedLocales: Locale[];
