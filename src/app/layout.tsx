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
  description:
    "Chào mừng đến với website tra cứu sự kiện lịch sử của chúng tôi! chúc bạn có một trải nghiệm tuyệt vời"
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
