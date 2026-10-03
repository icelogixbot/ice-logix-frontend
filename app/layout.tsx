import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Nunito } from 'next/font/google';
import { QueryProvider } from '@/components/providers/query-provider';
import { I18nProvider } from '@/lib/i18n/context';
import { CartProvider } from '@/lib/cart-context';
import { WishlistProvider } from '@/lib/wishlist-context';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ICE LOGIX | Доставка из Китая и Европы',
  description: 'Сервис выкупа и доставки брендовых товаров с Poizon, 1688, Taobao и ЕС в Беларусь',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0A1628',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`dark ${nunito.variable}`}>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <QueryProvider>
          <I18nProvider>
            <CartProvider>
              <WishlistProvider>{children}</WishlistProvider>
            </CartProvider>
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
