export type Locale = (typeof locales)[number];

export const locales = ['en', 'it', 'ru'] as const;
export const defaultLocale: Locale = 'it';
