import type { Metadata } from 'next';
import { Fraunces, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { Suspense } from 'react';
import { Analytics } from '@/components/marketing/Analytics';
import './globals.css';

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['opsz', 'SOFT'],
  display: 'swap',
  preload: true,
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  axes: ['opsz'],
  display: 'swap',
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: 'RestoStack — Restaurant OS para LatAm',
    template: '%s — RestoStack',
  },
  description:
    'RestoStack es el sistema operativo para operadores gastronómicos que ya saben que la cocina es el arte — y el resto, disciplina.',
  metadataBase: new URL('https://restostack.com'),
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'RestoStack',
    images: [
      {
        url: '/og?title=RestoStack+%E2%80%94+Tu+operaci%C3%B3n%2C+en+orden.',
        width: 1200,
        height: 630,
        alt: 'RestoStack — Restaurant OS para LatAm',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
