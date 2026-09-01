import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { AuthProvider } from "@/modules/auth";
import { PreferencesProvider, THEME_BOOTSTRAP_SCRIPT } from "@/modules/settings";
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
      // Le script d'amorçage ajoute `dark` avant l'hydratation : sans cette
      // annonce, React signalerait l'écart entre le HTML rendu et le DOM reçu.
      suppressHydrationWarning
    >
      <body className="min-h-full">
        {/* Premier nœud du body, donc exécuté avant que quoi que ce soit ne
            soit peint : c'est ce qui évite l'éclair clair au chargement. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <PreferencesProvider>
          <AuthProvider>{children}</AuthProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
