import type { Metadata } from "next";
import { Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/modules/auth";
import { PreferencesProvider, THEME_BOOTSTRAP_SCRIPT } from "@/modules/settings";
import { DesktopBridge } from "@/shared/desktop/desktop-bridge";
import "./globals.css";

/** Inter est la famille du design system repris de Twenty (FONT_COMMON). */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/**
 * Space Grotesk n'écrit que la marque — « OMPT » et « CRM » dans l'en-tête.
 * Deux graisses seulement : la marque n'en emploie pas d'autre, et chacune de
 * plus serait un fichier téléchargé pour rien.
 */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Un gabarit plutôt qu'un suffixe recopié dans chaque page : l'onglet lit
  // « Chantiers · OMPT CRM », et une page qui oublie son titre retombe sur
  // le nom du produit au lieu d'afficher celui de la précédente.
  title: {
    default: "OMPT CRM",
    template: "%s · OMPT CRM",
  },
  description:
    "Suivi des prospects, des chantiers, des devis et de la facturation du groupe OMPT.",
  applicationName: "OMPT CRM",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
      // Le script d'amorçage ajoute `dark` avant l'hydratation : sans cette
      // annonce, React signalerait l'écart entre le HTML rendu et le DOM reçu.
      suppressHydrationWarning
    >
      <body className="min-h-full">
        {/* Premier nœud du body, donc exécuté avant que quoi que ce soit ne
            soit peint : c'est ce qui évite l'éclair clair au chargement. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <PreferencesProvider>
          <AuthProvider>
            <DesktopBridge />
            {children}
          </AuthProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
