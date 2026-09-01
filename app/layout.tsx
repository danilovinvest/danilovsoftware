import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { AuthProvider } from "@/modules/auth";
import "./globals.css";

/** Inter est la famille du design system repris de Twenty (FONT_COMMON). */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Danilov CRM",
  description: "Suivi des prospects, clients, projets et devis.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
