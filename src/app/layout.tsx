import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AppProviders } from "./providers";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-main",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Tra Cứu Sự Kiện Lịch Sử",
  description: "Tra cứu sự kiện lịch sử nhanh chóng, rõ ràng và dễ theo dõi."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${beVietnamPro.variable} font-sans`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
