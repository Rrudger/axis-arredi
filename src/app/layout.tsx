import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import {NextIntlClientProvider} from 'next-intl';
import { getLocale } from 'next-intl/server';
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'], 
  variable: '--font-ibm',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "add title",
  description: "The title must be added",
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body   className={`${ibmPlexSans.variable} antialiased`}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
