import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import ClientLayout from './ui/client-layout';
import './globals.css';
import SplashScreen from './ui/SplashScreen'; //스플레시화면

// [Fix] 사용하지 않는 Navbar, Footer 임포트 제거 완료함

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Mind Signal - Neural Interface',
  description: 'Real-time neural signal measurement and analysis platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SplashScreen />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
