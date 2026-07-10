import type { Metadata } from "next";
import { Lora, Cinzel, Italianno, Playfair_Display, Great_Vibes } from "next/font/google";
import {NextIntlClientProvider} from 'next-intl';
import { getLocale } from 'next-intl/server';
import FaviconSwitcher from '@/components/layout/faviconswitcher';
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: '--font-cinzel',
  display: 'swap',
});

const italianno = Italianno({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-italianno',
  display: 'swap',
});

const lora = Lora({
  // cyrillic — для русской локализации (текст остаётся на Lora, у неё
  // полноценная кириллица); на en/it не влияет — грузится только нужный subset.
  // Только 400: все жирные начертания в проекте — у шрифта заголовков
  // (--font-sans), основной текст ходит одним регулярным весом.
  subsets: ['latin', 'cyrillic'],
  weight: ['400'],
  variable: '--font-lora',
  display: 'swap',
})

/* ── Русская локализация ─────────────────────────────────────────
   Cinzel и Italianno — латиница-only, в кириллице отваливаются в
   системный serif/cursive. Для ru подменяем их (через globals.css,
   селектор html[lang="ru"]) на кириллические аналоги той же
   стилистики: Playfair Display — витринный серив вместо Cinzel;
   Great Vibes — изящная тонкая каллиграфия (copperplate, XIX век) вместо
   Italianno. */
const playfair = Playfair_Display({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-playfair',
  display: 'swap',
});

const greatVibes = Great_Vibes({
  subsets: ['cyrillic', 'latin'],
  weight: ['400'],
  variable: '--font-greatvibes',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Axis arredi",
  description: "Axis arredi — L'arte di vivere lo spazio",
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body className={`${cinzel.variable} ${italianno.variable} ${lora.variable} ${playfair.variable} ${greatVibes.variable} antialiased`}>
        <FaviconSwitcher />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
