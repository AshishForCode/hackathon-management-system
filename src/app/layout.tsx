import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { SessionProvider } from "@/components/providers/session-provider";
import { Navbar } from "@/components/layout/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JECRC Hackathon Platform | University & Foundation",
  description:
    "Centralized hackathon management platform for JECRC University and JECRC Foundation. Registration, team formation, project tracking, and evaluation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
        <SessionProvider>
          <Suspense fallback={<div className="h-16 bg-slate-900 border-b border-slate-800" />}>
            <Navbar />
          </Suspense>
          <main className="flex-1">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
