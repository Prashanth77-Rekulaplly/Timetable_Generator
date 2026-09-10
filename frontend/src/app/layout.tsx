import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Schedulr — Automated Timetable Generator",
  description:
    "An automated timetable generator using graph coloring algorithms",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-50">
        <Providers>
          <ToastProvider>{children}</ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
