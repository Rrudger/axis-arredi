import type { Metadata } from "next";
import { Lora, Cinzel, Italianno } from "next/font/google";
import {NextIntlClientProvider} from 'next-intl';
import { getLocale } from 'next-intl/server';
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
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-lora',
  display: 'swap',
})

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
      <body className={`${cinzel.variable} ${italianno.variable} ${lora.variable} antialiased`}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
