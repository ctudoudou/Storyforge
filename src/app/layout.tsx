import type { Metadata } from "next";
import "../styles/index.css";

export const metadata: Metadata = {
  title: "Storyforge",
  description: "AI 短剧生成平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
