import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalLayout } from "@/components/layout/conditional-layout";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YNMO 管理コンソール",
  description: "YNMO 100億宣言支援AI 管理コンソール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // ブラウザ拡張が <html>/<body> に属性を後付けして hydration mismatch を起こすのを抑制。
      // Next.js 公式が推奨するパターン。コンポーネント内の本物の mismatch は引き続き検知される。
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ConditionalLayout>{children}</ConditionalLayout>
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
