import type { Metadata, Viewport } from 'next';
import { Caprasimo, Figtree, Noto_Sans_Thai } from 'next/font/google';
import './globals.css';

const caprasimo = Caprasimo({ weight: '400', subsets: ['latin'], variable: '--font-caprasimo' });
const figtree = Figtree({ weight: ['400', '600', '700'], subsets: ['latin'], variable: '--font-figtree' });
const notoThai = Noto_Sans_Thai({ weight: ['400', '500', '600', '700'], subsets: ['thai'], variable: '--font-noto-thai' });

export const metadata: Metadata = {
  title: 'WhongNaiMor',
  description: 'ชุมชนออนไลน์ของนักศึกษาและบุคลากร มช.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${caprasimo.variable} ${figtree.variable} ${notoThai.variable}`}>
      <body>{children}</body>
    </html>
  );
}
