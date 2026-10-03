import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ICE LOGIX | Доставка из Китая и Европы',
  description: 'Сервис выкупа и доставки брендовых товаров с Poizon, 1688, Taobao в Беларусь',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
