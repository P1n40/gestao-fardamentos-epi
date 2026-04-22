import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";
import { AppQueryProvider } from "@/components/providers/query-provider";
import { BackToHomeButton } from "@/components/shared/back-to-home-button";
import { Navbar } from "@/components/shared/navbar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gestão de Fardamentos e EPI",
  description: "Sistema para gestão de uniformes e equipamentos de proteção individual",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body className={inter.className}>
        <AuthProvider>
          <AppQueryProvider>
            <TooltipProvider>
              <Navbar />
              <BackToHomeButton />
              {children}
              <Toaster />
            </TooltipProvider>
          </AppQueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
