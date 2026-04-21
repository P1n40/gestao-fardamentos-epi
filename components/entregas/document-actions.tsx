"use client";

import { FileDown, Printer } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface DocumentActionsProps {
  elementId: string;
  filename: string;
}

/**
 * Enhanced action component for documents.
 * Offers both Print and a direct PDF download simulation.
 * Uses html2pdf for direct PDF export if possible, otherwise relies on Print-to-PDF.
 */
export function DocumentActions({ elementId, filename }: DocumentActionsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    // In many corporate environments, Browser Print is the most reliable way to maintain Tailwind styles.
    // However, for T38 US-35 "Exportar PDF", we try to provide a direct download if library is available.
    setIsExporting(true);
    try {
      // Dynamic import to avoid SSR issues and keep main bundle light
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById(elementId);

      if (!element) throw new Error("Elemento não encontrado");

      const opt = {
        margin: 10,
        filename: `${filename}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
        },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      };

      await html2pdf().from(element).set(opt).save();
    } catch (error) {
      console.error("Exportação falhou, recorrendo ao diálogo de impressão:", error);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={handleExportPdf}
        disabled={isExporting}
        className="gap-2 bg-zinc-900 shadow-sm"
      >
        <FileDown className="h-4 w-4" />
        {isExporting ? "Gerando..." : "Baixar PDF"}
      </Button>
    </div>
  );
}
