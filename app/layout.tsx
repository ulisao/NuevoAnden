import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Usamos Inter de Google
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/convex-provider";
import { Toaster } from "@/components/ui/sonner";

// Configuramos la fuente
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Turnero Futbol",
  description: "Reserva tu cancha al instante",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body className={inter.className}>
          <ConvexClientProvider>
            {children}
            <Toaster />
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}