import type { Metadata } from "next";
import "./globals.css";
// Force Reload V1.011

export const metadata: Metadata = {
  title: "매트리스 설계 에이전트 | Mattress Design Agent",
  description: "매트리스 사양을 입력하면 도면, 견적서, 브로셔를 자동 생성하는 스마트 설계 도구",
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
